import { TestQuestionsEntity } from "./test-questions.entity";

export interface TestEntity {
    id: string;
    testType: string;
    description: string;
    testName: string;
    duration: number;
    totalQuestions: number;
}
