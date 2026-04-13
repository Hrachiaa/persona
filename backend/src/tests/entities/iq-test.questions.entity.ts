interface SixOptions {
    1: number;
    2: number;
    3: number;
    4: number
    5: number;
    6: number

}

interface EightOptions {
    1: number;
    2: number;
    3: number;
    4: number
    5: number;
    6: number;
    7: number;
    8: number
}

export interface Scoring {
    a1: SixOptions;
    a2: SixOptions;
    a3: SixOptions;
    a4: SixOptions;
    a5: SixOptions;
    a6: SixOptions;
    a7: SixOptions;
    a8: SixOptions;
    a9: SixOptions;
    a10: SixOptions;
    a11: SixOptions;
    a12: SixOptions;
    b1: SixOptions;
    b2: SixOptions;
    b3: SixOptions;
    b4: SixOptions;
    b5: SixOptions;
    b6: SixOptions;
    b7: SixOptions;
    b8: SixOptions;
    b9: SixOptions;
    b10: SixOptions;
    b11: SixOptions;
    b12: SixOptions;
    c1: EightOptions;
    c2: EightOptions;
    c3: EightOptions;
    c4: EightOptions;
    c5: EightOptions;
    c6: EightOptions;
    c7: EightOptions;
    c8: EightOptions;
    c9: EightOptions;
    c10: EightOptions;
    c11: EightOptions;
    c12: EightOptions;
    d1: EightOptions;
    d2: EightOptions;
    d3: EightOptions;
    d4: EightOptions;
    d5: EightOptions;
    d6: EightOptions;
    d7: EightOptions;
    d8: EightOptions;
    d9: EightOptions;
    d10: EightOptions;
    d11: EightOptions;
    d12: EightOptions;
    e1: EightOptions;
    e2: EightOptions;
    e3: EightOptions;
    e4: EightOptions;
    e5: EightOptions;
    e6: EightOptions;
    e7: EightOptions;
    e8: EightOptions;
    e9: EightOptions;
    e10: EightOptions;
    e11: EightOptions;
    e12: EightOptions;
    
}

interface Result {a: number, b: number, c: number, d: number, e: number, iq: number}

export interface Results {
    15: Result;
    16: Result;
    17: Result;
    18: Result;
    19: Result;
    20: Result;
    21: Result;
    22: Result;
    23: Result;
    24: Result;
    25: Result;
    26: Result;
    27: Result;
    28: Result;
    29: Result;
    30: Result;
    31: Result;
    32: Result;
    33: Result;
    34: Result;
    35: Result;
    36: Result;
    37: Result;
    38: Result;
    39: Result;
    40: Result;
    41: Result;
    42: Result;
    43: Result;
    44: Result;
    45: Result;
    46: Result;
    47: Result;
    48: Result;
    49: Result;
    50: Result;
    51: Result;
    52: Result;
    53: Result;
    54: Result;
    55: Result;
    56: Result;
    57: Result;
    58: Result;
    59: Result;
    60: Result;
}

export interface QuestionsEntity{
    questions: [];
    scoring: Scoring,
    results: Results
}

export interface QuestionsDBTableEntity {
    id: string;
    questions: QuestionsEntity
    testId: string;
}