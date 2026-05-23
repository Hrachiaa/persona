export interface IqTestResult {
    iq: number,
    blocks: { a: number, b: number, c: number, d: number, e: number },
    reliability: "valid" | "suspicious" | "invalid"
}

export interface BigFiveResults {
    E1: {name: 'Friendliness', score: number}
    E2: {name: 'Gregariousness', score: number}
    E3: {name: 'Assertiveness', score: number}
    E4: {name: 'Activity Level', score: number}
    E5: {name: 'Excitement-seeking', score: number}
    E6: {name: 'Cheerfulness', score: number}

    A1: {name: 'Trust', score: number}
    A2: {name: 'Morality', score: number}
    A3: {name: 'Altruism', score: number}
    A4: {name: 'Cooperation', score: number}
    A5: {name: 'Modesty', score: number}
    A6: {name: 'Sympathy', score: number}

    C1: {name: 'Self-efficacy', score: number}
    C2: {name: 'Orderliness', score: number}
    C3: {name: 'Dutifulness', score: number}
    C4: {name: 'Achievement-striving', score: number}
    C5: {name: 'Self-discipline', score: number}
    C6: {name: 'Cautiousness', score: number}

    N1: {name: 'Anxiety', score: number}
    N2: {name: 'Anger', score: number}
    N3: {name: 'Depression', score: number}
    N4: {name: 'Self-consciousness', score: number}
    N5: {name: 'Immoderation', score: number}
    N6: {name: 'Vulnerability', score: number}

    O1: {name: 'Imagination', score: number}
    O2: {name: 'Artistic Interests', score: number}
    O3: {name: 'Emotionality', score: number}
    O4: {name: 'Adventurousness', score: number}
    O5: {name: 'Intellect', score: number}
    O6: {name: 'Liberalism', score: number}

    E: {name: 'Extraversion', score: number}
    A: {name: 'Agreeableness', score: number}
    C: {name: 'Conscientiousness', score: number}
    N: {name: 'Neuroticism', score: number}
    O: {name: 'Openness', score: number}
    
}

export interface ArchetypeTestResult {
    
}

export interface MbtiTestResult {
    
}

export type TestResultType = IqTestResult | BigFiveResults | ArchetypeTestResult | MbtiTestResult;

export class TestResultEntity {
    constructor(
        readonly id: string,
        readonly userId: string,
        readonly testId: string,
        readonly testType: string,
        readonly result: TestResultType
    ){}
}
