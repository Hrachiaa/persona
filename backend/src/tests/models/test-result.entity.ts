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

export interface ShcwartzTestResult {
    values: {
        1: {name: 'Self-Direction: Autonomy of Thought', description: `Freedom to cultivate one's own ideas`, score: number},
        2: {name: 'Self-Direction: Autonomy of Action', description: `Freedom to determine one's own actions`, score: number},
        3: {name: 'Stimulation', description: 'Excitement, novelty, and change', score: number},
        4: {name: 'Hedonism', description: 'Pleasure or sensuous gratification', score: number},
        5: {name: 'Achievement', description: 'Success according to social standards', score: number},
        6: {name: 'Power: Dominance over people', description: '', score: number},
        7: {name: 'Power: Resources', description: 'Wealth and material resources', score: number},
        8: {name: 'Face', description: 'Maintaining public image', score: number},
        9: {name: 'Security: Societal', description: 'Security in the wider society', score: number},
        10: {name: 'Security: Personal', description: `Security of self and one's immediate environment`, score: number},
        11: {name: 'Tradition', description: 'Maintaining and preserving cultural, family and/or religious traditions', score: number},
        12: {name: 'Conformity: Rules', description: 'Compliance with rules, laws and formal obligations', score: number},
        13: {name: 'Conformity: Interpersonal', description: 'Avoidance of upsetting or harming others', score: number},
        14: {name: 'Humility', description: `Recognizing one's insignificance in the larger scheme of things`, score: number},
        15: {name: 'Benevolence: Dependability', description: 'Trustworthy and reliable', score: number},
        16: {name: 'Benevolence: Caring', description: 'Devotion to the needs of the in-group', score: number},
        17: {name: 'Universalism: Concern', description: 'Equality, justice and protection for the weak in society', score: number},
        18: {name: 'Universalism: Nature', description: 'Preservation of the natural environment', score: number},
        19: {name: 'Universalism: Tolerance', description: 'Acceptance and understanding of those who differ from oneself', score: number},
    
    },
    higherOrderValues: {
        1: {name: 'Self-Transcendence', description: 'Combine means for universalism-nature, universalism-concern, universalism-tolerance, benevolence-care, and benevolence-dependability', score: number},
        2: {name: 'Self-Enhancement', description: 'Combine means for achievement, power dominance and power resources', score: number},
        3: {name: 'Openness to change', description: 'Combine means for self-direction thought, self-direction action, stimulation and hedonism', score: number},
        4: {name: 'Conservation', description: 'Combine means for security-personal, security-societal, tradition, conformity-rules, conformity-interpersonal', score: number},
    }
}

export interface MbtiTestResult {
    
}

export type TestResultType = IqTestResult | BigFiveResults | ShcwartzTestResult | MbtiTestResult;

export class TestResultEntity {
    constructor(
        readonly id: string,
        readonly userId: string,
        readonly testId: string,
        readonly testType: string,
        readonly result: TestResultType
    ){}
}
