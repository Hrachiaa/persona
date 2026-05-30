import { Results, Scoring } from "./iqtest-questions.entity";

export class TestQuestionsEntity {
    constructor(
        readonly id: string,
        readonly testId: string,
        readonly questions: IqQuestions | BigFiveQuestions | ShcwartzQuestions | EcrQuestions | PidQuestions | CopeQuestions
    ){}
}

export interface Question {
    id: string;
    text: string;
    image: string;
    options: {
        id: string;
        text: string;
        icon: string;
    }[]
}

export interface IqQuestions {
    questions: Question[]
    scoring: Scoring
    results: Results
}

interface BigFiveQuestions {
    questions: Question[]
}

interface ShcwartzQuestions {
    questions: Question[]
}

interface EcrQuestions {
    questions: Question[]
}

interface CopeQuestions {
    questions: Question[]
}

interface PidQuestions {
    questions: Question[]
}