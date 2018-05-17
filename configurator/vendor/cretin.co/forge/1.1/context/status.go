package context

func httpStatus(i int) string {
	switch i {
	case 200:
		return "OK"
	case 201:
		return "Created"
	case 202:
		return "Accepted"
	case 203:
		return "NonAuthoritativeInfo"
	case 204:
		return "NoContent"
	case 205:
		return "ResetContent"
	case 206:
		return "PartialContent"

	case 300:
		return "MultipleChoices"
	case 301:
		return "MovedPermanently"
	case 302:
		return "Found"
	case 303:
		return "SeeOther"
	case 304:
		return "NotModified"
	case 305:
		return "UseProxy"
	case 307:
		return "TemporaryRedirect"

	case 400:
		return "BadRequest"
	case 401:
		return "Unauthorized"
	case 402:
		return "PaymentRequired"
	case 403:
		return "Forbidden"
	case 404:
		return "NotFound"
	case 405:
		return "MethodNotAllowed"
	case 406:
		return "NotAcceptable"
	case 407:
		return "ProxyAuthRequired"
	case 408:
		return "RequestTimeout"
	case 409:
		return "Conflict"
	case 410:
		return "Gone"
	case 411:
		return "LengthRequired"
	case 412:
		return "PreconditionFailed"
	case 413:
		return "RequestEntityTooLarge"
	case 414:
		return "RequestURITooLong"
	case 415:
		return "UnsupportedMediaType"
	case 416:
		return "RequestedRangeNotSatisfiable"
	case 417:
		return "ExpectationFailed"
	case 418:
		return "Teapot"
	case 428:
		return "PreconditionRequired"
	case 429:
		return "TooManyRequests"
	case 431:
		return "RequestHeaderFieldsTooLarge"
	case 451:
		return "UnavailableForLegalReasons"

	case 500:
		return "InternalServerError"
	case 501:
		return "NotImplemented"
	case 502:
		return "BadGateway"
	case 503:
		return "ServiceUnavailable"
	case 504:
		return "GatewayTimeout"
	case 505:
		return "HTTPVersionNotSupported"
	case 511:
		return "NetworkAuthenticationRequired"

	default:
		return ""
	}
}
