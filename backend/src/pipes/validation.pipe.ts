import { ArgumentMetadata, Injectable, PipeTransform } from "@nestjs/common";
import { validate } from "class-validator";
import { plainToClass } from "class-transformer";
import { ValidationException } from "src/exceptions/validation.exception";

@Injectable()
export class ValidationPipe implements PipeTransform {
  async transform(value: any, metadata: ArgumentMetadata) {
    const { metatype } = metadata;

    // Пропускаем примитивы и отсутствующий metatype
    if (!metatype || this.isPrimitive(metatype)) {
      return value;
    }

    const obj = plainToClass(metatype, value);
    const errors = await validate(obj, {
      whitelist: true,              // срезать лишние поля
      forbidNonWhitelisted: true,   // или бросать ошибку на лишние поля
    });

    if (errors.length) {
      const messages = errors.map((error) => {
        const constraints = error.constraints
          ? Object.values(error.constraints).join(", ")
          : "invalid value";
        return `${error.property} - ${constraints}`;
      });
      throw new ValidationException(messages);
    }

    return obj; // возвращаем трансформированный объект, а не сырой value
  }

  private isPrimitive(metatype: Function): boolean {
    return [String, Boolean, Number, Array, Object].includes(metatype as any);
  }
}