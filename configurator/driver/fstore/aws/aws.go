package aws

import (
	"bytes"
	"encoding/json"
	"io"
	"log"
	"time"

	"github.com/aws/aws-sdk-go/aws"
	"github.com/aws/aws-sdk-go/aws/awserr"
	"github.com/aws/aws-sdk-go/aws/session"
	"github.com/aws/aws-sdk-go/service/s3"
	"github.com/cptcretin/forge/app"
	"github.com/cptcretin/forge/context"

	"configurator/fstore"
)

type AwsClient struct {
	s3             *s3.S3
	defaultAcl     *string
	bucketPrefix   string
	filePathPrefix string
	c *context.C
}

type settings struct {
	Region           *string           `json:"region"`
	Endpoint         *string           `json:"endpoint"`
	S3ForcePathStyle *bool             `json:"forcePathstyle"`
	LogLevel         *aws.LogLevelType `json:"logLevel"`
	BucketPrefix     string            `json:"bucketPrefix"`
	PathPrefix       string            `json:"pathPrefix"`
}

type request struct {
	source   *fstore.UploadRequest
	attempts uint8
}

const (
	maxRetries     = 4
	retryWait      = 2
	linkExpiration = time.Minute * 30
)

var _clientDefaults settings

func init() {
	s := struct {
		Aws settings `json:"aws"`
	}{}

	if err := json.NewDecoder(bytes.NewBufferString(app.Environment("CONFIGURATOR_FSTORE_CONFIG"))).Decode(&s); err != nil {
		log.Fatalf("Could not read AWS configuration: %v", err)
	}

	_clientDefaults = s.Aws

	fstore.Register("aws", AwsClient{})
}

func (client AwsClient) New(c *context.C) fstore.FileClient {
	clientConfig := aws.Config{}

	app.Translate(_clientDefaults, &clientConfig)

	return fstore.FileClient(AwsClient{
		s3:             s3.New(session.New(), &clientConfig),
		defaultAcl:     aws.String(s3.ObjectCannedACLPrivate),
		bucketPrefix:   _clientDefaults.BucketPrefix,
		filePathPrefix: _clientDefaults.PathPrefix,
		c: c,
	})
}

func (client AwsClient) Write(r *fstore.UploadRequest) error {
	return _write(client, &request{source: r})
}

func _write(client AwsClient, r *request) error {
	_, err := client.s3.PutObject(&s3.PutObjectInput{
		Bucket:        client.bucketName(r.source.UploadType),
		Key:           aws.String(r.source.FileHandle),
		ACL:           client.defaultAcl,
		Body:          r.source.File,
		ContentLength: aws.Int64(r.source.FileSize),
		ContentType:   aws.String(r.source.Mime),
		Metadata: map[string]*string{
			"Key":  aws.String("MetadataValue"),
			"Mime": aws.String(r.source.Mime),
		},
	})

	if err != nil {
		if awsErr, ok := err.(awserr.Error); ok {
			if reqErr, ok := err.(awserr.RequestFailure); ok {
				context.Logf(context.Error, "Error occurred in call to S3: %v", reqErr)
			} else {
				context.Logf(context.Error, "Could not upload %s: %v", r.source.UploadType.String(), awsErr)
			}
		} else {
			context.Logf(context.Error, "Error while uploading %s: %v", r.source.UploadType.String(), err)

			if r.attempts < maxRetries {
				time.Sleep(time.Second * retryWait)

				r.attempts += 1
				return _write(client, r)
			}
		}

		return err
	}

	return nil
}

func (client AwsClient) Read(t fstore.FileType, handle string) ([]byte, *fstore.Details, error) {
	r, err := client.s3.GetObject(&s3.GetObjectInput{
		Bucket: client.bucketName(t),
		Key:    aws.String(handle),
	})

	if err != nil {
		if awsErr, ok := err.(awserr.Error); ok {
			if reqErr, ok := err.(awserr.RequestFailure); ok {
				context.Logf(context.Error, "Error occurred in call to s3: %v", reqErr)

				if reqErr.StatusCode() >= 400 && reqErr.StatusCode() < 500 {
					return nil, nil, fstore.FileNotFoundErr()
				}
			} else {
				context.Logf(context.Error, "Could not download %s %s: %v", t, handle, awsErr)
			}
		} else {
			context.Logf(context.Error, "Error while downloading %s %s: %v", t, handle, err)
		}

		return nil, nil, err
	}

	defer r.Body.Close()

	file := make([]byte, *r.ContentLength)

	if n, err := r.Body.Read(file); err != nil || n < len(file) {
		if err != io.EOF {
			context.Logf(context.Error, "Error encountered while reading %s: %v", t, handle, err)
			return nil, nil, err
		}
	}

	return file, &fstore.Details{Size: *r.ContentLength, Mime: r.Metadata["Mime"]}, nil
}

func (client AwsClient) GetStream(t fstore.FileType, handle string) (io.Reader, *fstore.Details, error) {
	r, err := client.s3.GetObject(&s3.GetObjectInput{
		Bucket: client.bucketName(t),
		Key:    aws.String(handle),
	})

	if err != nil {
		if awsErr, ok := err.(awserr.Error); ok {
			if reqErr, ok := err.(awserr.RequestFailure); ok {
				context.Logf(context.Error, "Error occurred in call to S3: %v", reqErr)

				if reqErr.StatusCode() >= 400 && reqErr.StatusCode() < 500 {
					return nil, nil, fstore.FileNotFoundErr()
				}
			} else {
				context.Logf(context.Error, "Could not download %s %s: %v", t, handle, awsErr)
			}
		} else {
			context.Logf(context.Error, "Error while downloading %s %s: %v", t, handle, err)
		}

		return nil, nil, err
	}

	return r.Body, &fstore.Details{Size: *r.ContentLength, Mime: r.Metadata["Mime"]}, nil
}

func (client AwsClient) GetLink(t fstore.FileType, handle string) (string, error) {
	r, _ := client.s3.GetObjectRequest(&s3.GetObjectInput{Bucket: client.bucketName(t), Key: aws.String(handle)})

	return r.Presign(linkExpiration)
}

func (c AwsClient) bucketName(t fstore.FileType) *string {
	return aws.String(c.bucketPrefix + t.String())
}

func (c AwsClient) filePath(t fstore.FileType, handle string) *string {
	return aws.String(c.filePathPrefix + t.String() + "/" + handle)
}
