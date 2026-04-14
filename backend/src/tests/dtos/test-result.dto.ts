import { ApiProperty } from "@nestjs/swagger";
import { IqTestResult, MbtiTestResult, SzondiTestResult, ArchetypeTestResult } from "../entities/test-result.entity";

export class TestResultDto {
    constructor(
        // @ApiProperty({example: 'cuid'})
        readonly testId: string,
        // @ApiProperty({example: 'iq'})
        readonly testType: 'iq' | 'szondi' | 'archetype' | 'mbti',
        // @ApiProperty({example: {iq: 123, blocks: {a: 12, b: 12, c: 11, d: 10, e: 8}, reliability: 'valid'}})
        readonly result: IqTestResult | SzondiTestResult | ArchetypeTestResult | MbtiTestResult
    ){}
}