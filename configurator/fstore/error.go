package fstore

type ErrorCode uint8

type RetrievalError struct {
	message string
	code    ErrorCode
}

func (er RetrievalError) Error() string {
	return er.message
}

const NotFound = ErrorCode(10)

func FileNotFoundErr() RetrievalError {
	return RetrievalError{"Could not locate file on the server.", NotFound}
}
