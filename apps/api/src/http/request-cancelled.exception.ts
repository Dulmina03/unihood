import { HttpException } from '@nestjs/common';

// The client abandoned the request or the routing provider reported cancellation.
// The filter suppresses this exception so no response is attempted on a closed connection.
export class RequestCancelledException extends HttpException {
  constructor() { super('REQUEST_CANCELLED', 499); }
}
