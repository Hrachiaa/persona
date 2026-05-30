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

export interface EcrResult {
    anxiety: number;
    avoidance: number
}

export interface CopeTestResult {
    1: { name: 'Positive reinterpretation and growth'; description: 'Making the best of the situation by growing from it, or viewing it in a more favorable light.'; score: number };
    2: { name: 'Mental disengagement'; description: 'Psychological disengagement from the goal with which the stressor is interfering, through daydreaming, sleep, or distraction.'; score: number };
    3: { name: 'Focus on and venting of emotions'; description: `An increased awareness of one's emotional distress, and a concomitant tendency to ventilate or discharge those feelings.`; score: number };
    4: { name: 'Use of instrumental social support'; description: 'Seeking assistance, information, or advice about what to do.'; score: number };
    5: { name: 'Active coping'; description: 'Taking action or exerting efforts to remove or circumvent the stressor.'; score: number };
    6: { name: 'Denial'; description: 'An attempt to reject the reality of the stressful event.'; score: number };
    7: { name: 'Religious coping'; description: 'Increased engagement in religious activities.'; score: number };
    8: { name: 'Humor'; description: ''; score: number };
    9: { name: 'Behavioral disengagement'; description: 'Giving up, or withdrawing effort from, the attempt to attain the goal with which the stressor is interfering.'; score: number };
    10: { name: 'Restraint'; description: `Coping passively by holding back one's coping attempts until they can be of use.`; score: number };
    11: { name: 'Use of emotional social support'; description: 'Getting sympathy or emotional support from someone.'; score: number };
    12: { name: 'Substance use'; description: ''; score: number };
    13: { name: 'Acceptance'; description: 'Accepting the fact that the stressful event has occurred and is real.'; score: number };
    14: { name: 'Suppression of competing activities'; description: 'Suppressing attention to other activities in which one might engage, in order to concentrate more completely on dealing with the stressor.'; score: number };
    15: { name: 'Planning'; description: `Thinking about how to confront the stressor, planning one's active coping efforts.`; score: number };
}

export interface PidTestResult {
    
}

interface Test {

}

export type TestResultType = IqTestResult | BigFiveResults | ShcwartzTestResult | EcrResult | CopeTestResult | Test;

export class TestResultEntity {
    constructor(
        readonly id: string,
        readonly userId: string,
        readonly testId: string,
        readonly testType: string,
        readonly result: TestResultType
    ){}
}
