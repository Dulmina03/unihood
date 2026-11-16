import { BadRequestException, type PipeTransform } from '@nestjs/common';
import { publicValidationDetails, type RuntimeSchema } from '@unihood/contracts';
export class ContractValidationPipe<T> implements PipeTransform<unknown, T> {
  constructor(private readonly schema: RuntimeSchema<T>) {}
  transform(input: unknown): T {
    const result = this.schema.safeParse(input);
    if (!result.success) throw new BadRequestException({contractValidation: true, details: publicValidationDetails(result.error.issues)});
    return result.data;
  }
}
