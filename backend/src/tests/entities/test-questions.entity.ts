import { Results, Scoring } from "./iqtest-questions.entity";

export class TestQuestionsEntity {
    constructor(
        readonly id: string,
        readonly testId: string,
        readonly questions: IqQuestions | SzondiQuestions | ArchetypeQuestions | MbtiQuestions
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

interface SzondiQuestions {
    questions: Question[]
}

interface ArchetypeQuestions {
    questions: Question[]
}

interface MbtiQuestions {
    questions: Question[]
}