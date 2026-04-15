export interface IqTestResult {
    iq: number,
    blocks: { a: number, b: number, c: number, d: number, e: number },
    reliability: "valid" | "suspicious" | "invalid"
}

export interface SzondiTestResult {
    
}

export interface ArchetypeTestResult {
    
}

export interface MbtiTestResult {
    
}

export type TestResultType = IqTestResult | SzondiTestResult | ArchetypeTestResult | MbtiTestResult;

export class TestResultEntity {
    constructor(
        readonly id: string,
        readonly userId: string,
        readonly testId: string,
        readonly testType: string,
        readonly result: TestResultType
    ){}
}
