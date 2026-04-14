export class QuestionsDto {
    id: string;
    text: string;
    image: string;
    options: {
        id: string;
        text: string;
        icon: string;
    }[]
}