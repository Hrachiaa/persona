import { IqTestResult, EcrResult, BigFiveResults, ShcwartzTestResult, CopeTestResult, PidTestResult } from "../models/test-result.entity";

// Public, unauthenticated view of a shared test result. Carries the test name and
// the owner's first name (no email/id) so the share page can render a friendly
// header without exposing the owner's account.
export class SharedResultDto {
    constructor(
        readonly testType: 'iq' | 'bigFive' | 'shcwartz' | 'ecr' | 'cope' | 'pid',
        readonly testName: string,
        readonly ownerName: string | null,
        readonly result: IqTestResult | BigFiveResults | ShcwartzTestResult | EcrResult | CopeTestResult | PidTestResult,
    ){}
}
