import { HttpStatus, ParseFilePipeBuilder } from '@nestjs/common';

export const SupportingDocumentValidator = new ParseFilePipeBuilder()
  .addFileTypeValidator({ fileType: 'application/pdf' })
  .addMaxSizeValidator({ maxSize: 10 * 1024 * 1024 })
  .build({
    errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY,
  });
