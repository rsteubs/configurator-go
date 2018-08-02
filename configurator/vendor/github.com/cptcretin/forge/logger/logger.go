package logger

import (
	"bytes"
	"encoding/json"
	"log"
	"os"

	"github.com/natefinch/lumberjack"
)

var (
	trace_rotate,
	info_rotate,
	warn_rotate,
	err_rotate,
	trace_std,
	info_std,
	warn_std,
	err_std *log.Logger
)

const (
	logLevelError = uint8(1)
	logLevelWarn  = uint8(2)
	logLevelInfo  = uint8(3)
	logLevelTrace = uint8(4)

	logOutStd  = uint8(1)
	logOutFile = uint8(2)
)

var logLevel uint8

func init() {
	type cfg struct {
		Filename   string `json:"filename"`
		MaxSize    int    `json:"maxSize"`
		MaxBackups int    `json:"maxBackups"`
		MaxAge     int    `json:"maxAge"`
		LocalTime  bool   `json:"localTime"`
		LogLevel   uint8  `json:"logLevel"`
		LogOutput  uint8  `json:"logOutput"`
	}

	c := cfg{
		LogLevel:  logLevelTrace,
		LogOutput: logOutStd | logOutFile,
	}

	if v, ok := os.LookupEnv("APP_LOGGING"); ok {
		b := bytes.NewBufferString(v)

		if err := json.NewDecoder(b).Decode(&c); err != nil {
			log.Fatal("Configuration missing for \"APP_LOGGING\"")
		}
	} else {
		log.Fatal("Configuration missing for \"APP_LOGGING\"")
	}

	Tracef("Log Configuration: %v", c)

	if (c.LogOutput & logOutFile) == logOutFile {
		l := lumberjack.Logger{
			MaxSize:    int64(c.MaxSize),
			MaxBackups: c.MaxBackups,
			MaxAge:     c.MaxAge,
			LocalTime:  c.LocalTime,
		}

		trace_rotate = log.New(&l, "TRACE: ", log.LstdFlags)
		info_rotate = log.New(&l, "INFO: ", log.LstdFlags)
		warn_rotate = log.New(&l, "WARN: ", log.LstdFlags)
		err_rotate = log.New(&l, "ERROR: ", log.LstdFlags)
	}

	if (c.LogOutput & logOutStd) == logOutStd {
		trace_std = log.New(os.Stdout, "TRACE: ", log.LstdFlags)
		info_std = log.New(os.Stdout, "INFO: ", log.LstdFlags)
		warn_std = log.New(os.Stdout, "WARN: ", log.LstdFlags)
		err_std = log.New(os.Stderr, "ERROR: ", log.LstdFlags)
	}

	logLevel = c.LogLevel
}

func Error(msg ...interface{}) {
	if logLevel >= logLevelError {
		if err_rotate != nil {
			err_rotate.Println(msg...)
		}
		if err_std != nil {
			err_std.Println(msg...)
		}
	}
}

func Errorf(msg string, a ...interface{}) {
	if logLevel >= logLevelError {
		if err_rotate != nil {
			err_rotate.Printf(msg, a...)
		}
		if err_std != nil {
			err_std.Printf(msg, a...)
		}
	}
}

func Info(msg ...interface{}) {
	if logLevel >= logLevelInfo {
		if info_rotate != nil {
			info_rotate.Println(msg...)
		}
		if info_std != nil {
			info_std.Println(msg...)
		}
	}
}

func Infof(msg string, a ...interface{}) {
	if logLevel >= logLevelInfo {
		if info_rotate != nil {
			info_rotate.Printf(msg, a...)
		}
		if info_std != nil {
			info_std.Printf(msg, a...)
		}
	}
}

func Trace(msg ...interface{}) {
	if logLevel >= logLevelTrace {
		if trace_rotate != nil {
			trace_rotate.Println(msg...)
		}
		if trace_std != nil {
			trace_std.Println(msg...)
		}
	}
}

func Tracef(msg string, a ...interface{}) {
	if logLevel >= logLevelTrace {
		if trace_rotate != nil {
			trace_rotate.Printf(msg, a...)
		}
		if trace_std != nil {
			trace_std.Printf(msg, a...)
		}
	}
}

func Warn(msg ...interface{}) {
	if logLevel >= logLevelWarn {
		if warn_rotate != nil {
			warn_rotate.Println(msg...)
		}
		if warn_std != nil {
			warn_std.Println(msg...)
		}
	}
}

func Warnf(msg string, a ...interface{}) {
	if logLevel >= logLevelWarn {
		if warn_rotate != nil {
			warn_rotate.Printf(msg, a...)
		}
		if warn_std != nil {
			warn_std.Printf(msg, a...)
		}
	}
}
