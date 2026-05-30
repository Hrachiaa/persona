import { ApiProperty } from "@nestjs/swagger";
import { IqTestResult, EcrResult, BigFiveResults, ShcwartzTestResult, CopeTestResult, PidTestResult } from "../models/test-result.entity";

export class TestResultDto {
    constructor(
        // @ApiProperty({example: 'cuid'})
        readonly testId: string,
        // @ApiProperty({example: 'iq'})
        readonly testType: 'iq' | 'bigFive' | 'shcwartz' | 'ecr' | 'cope' | 'pid',
        // @ApiProperty({example: {iq: 123, blocks: {a: 12, b: 12, c: 11, d: 10, e: 8}, reliability: 'valid'}})
        readonly result: IqTestResult | BigFiveResults | ShcwartzTestResult | EcrResult | CopeTestResult | PidTestResult
    ){}
}