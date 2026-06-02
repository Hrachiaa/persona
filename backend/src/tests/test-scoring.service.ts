import { BadRequestException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { TestRepository } from './test.repository';
import { AnswerDto } from './dtos/submit-test.dto';
import { IqTestResult, EcrResult, BigFiveResults, ShcwartzTestResult, CopeTestResult, PidTestResult } from './models/test-result.entity';
import { Result, Results, Scoring } from './models/iqtest-questions.entity';
import { TestQuestionsEntity } from './models/test-questions.entity';
import { UsersService } from '../users/users.service';
import { testQuestions } from './tests.seed';

type TestResult = IqTestResult | BigFiveResults | ShcwartzTestResult | EcrResult | CopeTestResult | PidTestResult;

@Injectable()
export class TestScoringService {
    constructor(
        private readonly usersService: UsersService,
        private readonly testRepository: TestRepository,
    ) {}

    async calculate(testType: string, userId: string, testId: string, answers: AnswerDto[]): Promise<TestResult> {
        const calculators = {
            iq: this.calculateIQ,
            bigFive: this.calculateBigFive,
            shcwartz: this.calculateSchwartz,
            ecr: this.calculateEcr,
            cope: this.calculateCope,
            pid: this.calculatePid
        }

        const calculator = calculators[testType]
        if (!calculator) throw new InternalServerErrorException('Calculator for test type not found')

        return calculator(userId, testId, answers)
    }

    private calculateIQ = async (userId: string, testId: string, answers: AnswerDto[]): Promise<IqTestResult> => {
        const questions = await this.testRepository.getTestQuestions(testId) as TestQuestionsEntity | null
        if (!questions || !('scoring' in questions.questions) || !('results' in questions.questions)) throw new InternalServerErrorException('Options for calculate results not found')

        const res: IqTestResult = {
            iq: 0,
            blocks: {a: 0, b: 0, c: 0, d: 0, e: 0},
            reliability: 'valid'
        }
        const scoring: Scoring = questions.questions.scoring
        const results: Results = questions.questions.results

        answers.forEach((answer) => {
        const block = answer.questionId[0]
            if (!(block in res.blocks)) return
            res.blocks[block] += scoring[answer.questionId]?.[answer.optionId] ?? 0
        })

        const score = (res.blocks.a + res.blocks.b + res.blocks.c + res.blocks.d + res.blocks.e)

        if(!(score in results)){
            res.reliability = 'invalid'
            return res
        }
        const expected: Result = results[score]
        res.iq = expected.iq

        const deviations = Object.entries(res.blocks).map(([block, value]) => {
            return Math.abs(value - expected[block])
        })
        const hasAbove2 = deviations.some(d => d > 2);
        const sum = deviations.reduce((acc, d) => acc + d, 0);
        const isSumAbove6 = sum > 6;
        if(hasAbove2 || isSumAbove6){
            res.reliability = 'suspicious'
        }

        return res
    }

    private calculateBigFive = async (userId: string, testId: string, answers: AnswerDto[]): Promise<BigFiveResults> => {
        if(answers.length !== 120){throw new BadRequestException('Count of answers has to be 120')}
        const user = await this.usersService.getUserById(userId)
        if(!user || !user.gender) throw new BadRequestException('Confirm gender of user')
        const scores = testQuestions.bigFive.questions.scoring[user.gender]

        const res: BigFiveResults = {
            E1: {name: 'Friendliness', score: 0},
            E2: {name: 'Gregariousness', score: 0},
            E3: {name: 'Assertiveness', score: 0},
            E4: {name: 'Activity Level', score: 0},
            E5: {name: 'Excitement-seeking', score: 0},
            E6: {name: 'Cheerfulness', score: 0},

            A1: {name: 'Trust', score: 0},
            A2: {name: 'Morality', score: 0},
            A3: {name: 'Altruism', score: 0},
            A4: {name: 'Cooperation', score: 0},
            A5: {name: 'Modesty', score: 0},
            A6: {name: 'Sympathy', score: 0},

            C1: {name: 'Self-efficacy', score: 0},
            C2: {name: 'Orderliness', score: 0},
            C3: {name: 'Dutifulness', score: 0},
            C4: {name: 'Achievement-striving', score: 0},
            C5: {name: 'Self-discipline', score: 0},
            C6: {name: 'Cautiousness', score: 0},

            N1: {name: 'Anxiety', score: 0},
            N2: {name: 'Anger', score: 0},
            N3: {name: 'Depression', score: 0},
            N4: {name: 'Self-consciousness', score: 0},
            N5: {name: 'Immoderation', score: 0},
            N6: {name: 'Vulnerability', score: 0},

            O1: {name: 'Imagination', score: 0},
            O2: {name: 'Artistic Interests', score: 0},
            O3: {name: 'Emotionality', score: 0},
            O4: {name: 'Adventurousness', score: 0},
            O5: {name: 'Intellect', score: 0},
            O6: {name: 'Liberalism', score: 0},

            E: {name: 'Extraversion', score: 0},
            A: {name: 'Agreeableness', score: 0},
            C: {name: 'Conscientiousness', score: 0},
            N: {name: 'Neuroticism', score: 0},
            O: {name: 'Openness', score: 0}
        }

        answers.forEach((a)=> {
            res[a.questionId].score += Number(a.optionId)
            res[a.questionId[0]].score += Number(a.optionId)
        })

        Object.keys(res).forEach(key => {
            res[key].score = (50 + 10 * (res[key].score - scores[key].mean) / scores[key].sd)
        })
        return res

    }
    private calculateSchwartz = async (userId: string, testId: string, answers: AnswerDto[]): Promise<ShcwartzTestResult> => {
        if(answers.length !== 57){throw new BadRequestException('Count of answers has to be 57')}

        const res: ShcwartzTestResult = {
            values: {
                1: {name: 'Self-Direction: Autonomy of Thought', description: `Freedom to cultivate one's own ideas`, score: 0},
                2: {name: 'Self-Direction: Autonomy of Action', description: `Freedom to determine one's own actions`, score: 0},
                3: {name: 'Stimulation', description: 'Excitement, novelty, and change', score: 0},
                4: {name: 'Hedonism', description: 'Pleasure or sensuous gratification', score: 0},
                5: {name: 'Achievement', description: 'Success according to social standards', score: 0},
                6: {name: 'Power: Dominance over people', description: '', score: 0},
                7: {name: 'Power: Resources', description: 'Wealth and material resources', score: 0},
                8: {name: 'Face', description: 'Maintaining public image', score: 0},
                9: {name: 'Security: Societal', description: 'Security in the wider society', score: 0},
                10: {name: 'Security: Personal', description: `Security of self and one's immediate environment`, score: 0},
                11: {name: 'Tradition', description: 'Maintaining and preserving cultural, family and/or religious traditions', score: 0},
                12: {name: 'Conformity: Rules', description: 'Compliance with rules, laws and formal obligations', score: 0},
                13: {name: 'Conformity: Interpersonal', description: 'Avoidance of upsetting or harming others', score: 0},
                14: {name: 'Humility', description: `Recognizing one's insignificance in the larger scheme of things`, score: 0},
                15: {name: 'Benevolence: Dependability', description: 'Trustworthy and reliable', score: 0},
                16: {name: 'Benevolence: Caring', description: 'Devotion to the needs of the in-group', score: 0},
                17: {name: 'Universalism: Concern', description: 'Equality, justice and protection for the weak in society', score: 0},
                18: {name: 'Universalism: Nature', description: 'Preservation of the natural environment', score: 0},
                19: {name: 'Universalism: Tolerance', description: 'Acceptance and understanding of those who differ from oneself', score: 0},

            },

            higherOrderValues: {
                1: {name: 'Self-Transcendence', description: 'Combine means for universalism-nature, universalism-concern, universalism-tolerance, benevolence-care, and benevolence-dependability', score: 0},
                2: {name: 'Self-Enhancement', description: 'Combine means for achievement, power dominance and power resources', score: 0},
                3: {name: 'Openness to change', description: 'Combine means for self-direction thought, self-direction action, stimulation and hedonism', score: 0},
                4: {name: 'Conservation', description: 'Combine means for security-personal, security-societal, tradition, conformity-rules, conformity-interpersonal', score: 0},
            }
        }

        answers.forEach(a => {
            res.values[a.questionId].score += Number(a.optionId)
        })

        let mediumScore = 0

        Object.keys(res.values).forEach(a => {
            const realScore = res.values[a].score / 3
            res.values[a].score = realScore
            mediumScore += realScore
        })

        Object.keys(res.values).forEach(a => {
            const centreScore = Math.round((res.values[a].score - mediumScore/19) * 100) / 100
            res.values[a].score = centreScore
        })

        res.higherOrderValues[1].score = Math.round(((res.values[15].score + res.values[16].score + res.values[17].score + res.values[18].score + res.values[19].score) / 5) * 100) / 100
        res.higherOrderValues[2].score = Math.round(((res.values[5].score + res.values[6].score + res.values[7].score) / 3) * 100) / 100
        res.higherOrderValues[3].score = Math.round(((res.values[1].score + res.values[2].score + res.values[3].score + res.values[4].score) / 4) * 100) / 100
        res.higherOrderValues[4].score = Math.round(((res.values[9].score + res.values[10].score + res.values[11].score + res.values[12].score + res.values[13].score) / 5) * 100) / 100

        return res
    }

    private calculateEcr = async (userId: string, testId: string, answers: AnswerDto[]): Promise<EcrResult> => {
        const res: EcrResult = {
            anxiety: 0,
            avoidance: 0
        }

        answers.forEach(a => {
            if(Number(a.questionId) < 19) {res.anxiety += Number(a.optionId)} else {res.avoidance += Number(a.optionId)}
        })

        Object.keys(res).forEach(a => res[a] /= 18)
        return res
    }

    private calculateCope = async (userId: string, testId: string, answers: AnswerDto[]): Promise<CopeTestResult> => {
        const res: CopeTestResult = {
            1: { name: 'Positive reinterpretation and growth', description: 'Making the best of the situation by growing from it, or viewing it in a more favorable light.', score: 0 },
            2: { name: 'Mental disengagement', description: 'Psychological disengagement from the goal with which the stressor is interfering, through daydreaming, sleep, or distraction.', score: 0 },
            3: { name: 'Focus on and venting of emotions', description: `An increased awareness of one's emotional distress, and a concomitant tendency to ventilate or discharge those feelings.`, score: 0 },
            4: { name: 'Use of instrumental social support', description: 'Seeking assistance, information, or advice about what to do.', score: 0 },
            5: { name: 'Active coping', description: 'Taking action or exerting efforts to remove or circumvent the stressor.', score: 0 },
            6: { name: 'Denial', description: 'An attempt to reject the reality of the stressful event.', score: 0 },
            7: { name: 'Religious coping', description: 'Increased engagement in religious activities.', score: 0 },
            8: { name: 'Humor', description: '', score: 0 },
            9: { name: 'Behavioral disengagement', description: 'Giving up, or withdrawing effort from, the attempt to attain the goal with which the stressor is interfering.', score: 0 },
            10: { name: 'Restraint', description: `Coping passively by holding back one's coping attempts until they can be of use.`, score: 0 },
            11: { name: 'Use of emotional social support', description: 'Getting sympathy or emotional support from someone.', score: 0 },
            12: { name: 'Substance use', description: '', score: 0 },
            13: { name: 'Acceptance', description: 'Accepting the fact that the stressful event has occurred and is real.', score: 0 },
            14: { name: 'Suppression of competing activities', description: 'Suppressing attention to other activities in which one might engage, in order to concentrate more completely on dealing with the stressor.', score: 0 },
            15: { name: 'Planning', description: `Thinking about how to confront the stressor, planning one's active coping efforts.`, score: 0 },
        }

        answers.forEach(a => {
            res[a.questionId].score += Number(a.optionId)
        })

        Object.keys(res).forEach(a=> {
            res[a].score = res[a].score / 4
        })

        return res
    }

    private calculatePid = async (userId: string, testId: string, answers: AnswerDto[]): Promise<PidTestResult> => {
        const res: PidTestResult = {
            values: {
                1: { name: 'Anhedonia', description: 'Lack of interest or pleasure in activities, diminished capacity to experience joy.', score: 0 },
                2: { name: 'Anxiousness', description: 'Frequent feelings of tension, worry, and apprehension.', score: 0 },
                3: { name: 'Attention Seeking', description: 'Actively seeking attention and validation from others, often at the expense of others\' needs.', score: 0 },
                4: { name: 'Callousness', description: `Lack of empathy or concern for others' feelings, showing indifference to their suffering.`, score: 0 },
                5: { name: 'Deceitfulness', description: 'Dishonesty, tendency to deceive or manipulate others for personal gain.', score: 0 },
                6: { name: 'Depressivity', description: 'Frequent feelings of sadness, hopelessness, and low mood.', score: 0 },
                7: { name: 'Distractibility', description: 'Difficulty in maintaining focus and easily getting distracted by external stimuli.', score: 0 },
                8: { name: 'Eccentricity', description: 'Unconventional and idiosyncratic behaviours or beliefs.', score: 0 },
                9: { name: 'Emotional Lability', description: 'Rapid shifts in emotions, with intense mood swings.', score: 0 },
                10: { name: 'Grandiosity', description: `Exaggerated sense of self-importance, arrogance, and a belief in one's superiority.`, score: 0 },
                11: { name: 'Hostility', description: 'Frequent feelings of anger, resentment, and a tendency to be hostile towards others.', score: 0 },
                12: { name: 'Impulsivity', description: 'Acting on urges and desires without considering potential consequences.', score: 0 },
                13: { name: 'Intimacy Avoidance', description: 'Avoiding or feeling uncomfortable in close relationships, maintaining emotional distance.', score: 0 },
                14: { name: 'Irresponsibility', description: 'Lack of reliability and failure to fulfil obligations and commitments.', score: 0 },
                15: { name: 'Manipulativeness', description: 'Using others for personal gain, manipulating or exploiting their emotions.', score: 0 },
                16: { name: 'Perceptual Dysregulation', description: 'Distorted perception of reality, experiencing unusual sensory experiences or hallucinations.', score: 0 },
                17: { name: 'Perseveration', description: 'Repeating thoughts, behaviours, or actions excessively and having difficulty changing focus.', score: 0 },
                18: { name: 'Restricted Affectivity', description: 'Limited range of emotional expression, appearing emotionally distant or cold.', score: 0 },
                19: { name: 'Rigid Perfectionism', description: 'Setting high standards for oneself and others, with a tendency towards inflexibility.', score: 0 },
                20: { name: 'Risk Taking', description: 'Seeking out or engaging in potentially dangerous or risky activities.', score: 0 },
                21: { name: 'Separation Insecurity', description: 'Fear of abandonment or rejection, often leading to clingy behaviours in relationships.', score: 0 },
                22: { name: 'Submissiveness', description: `Tendency to submit to others' demands or authority, often at the expense of one's own needs.`, score: 0 },
                23: { name: 'Suspiciousness', description: `Mistrust and suspicion of others' intentions, feeling easily threatened.`, score: 0 },
                24: { name: 'Unusual Beliefs and Experiences', description: 'Holding beliefs or experiences that are unconventional or at odds with societal norms.', score: 0 },
                25: { name: 'Withdrawal', description: 'Avoiding social interactions, preferring to be alone or isolated from others.', score: 0 },
            },
            higherOrderValues: {
                1: { name: 'Negative Affectivity', description: 'The tendency to experience a range of negative emotions, such as anxiety, sadness, and irritability, with difficulty regulating them.', score: 0 },
                2: { name: 'Detachment', description: 'Emotional and social withdrawal, difficulty connecting with others, and a preference for solitude.', score: 0 },
                3: { name: 'Antagonism', description: 'Interpersonal hostility, manipulation, and callousness, with a lack of empathy or concern for others.', score: 0 },
                4: { name: 'Disinhibition', description: 'Impulsivity and lack of self-control, with reckless behaviour and difficulty resisting temptations.', score: 0 },
                5: { name: 'Psychoticism', description: 'Unusual or eccentric patterns of thinking and perceiving reality.', score: 0 }
            }
        }

        answers.forEach(a => {
            res.values[a.questionId].score += Number(a.optionId)
        })

        Object.keys(res.values).forEach(a=> {
            res.values[a].score = res.values[a].score / 4
        })

        res.higherOrderValues[1].score = Math.round(((res.values[2].score + res.values[9].score + res.values[21].score) / 3) * 100) / 100
        res.higherOrderValues[2].score = Math.round(((res.values[1].score + res.values[13].score + res.values[25].score) / 3) * 100) / 100
        res.higherOrderValues[3].score = Math.round(((res.values[5].score + res.values[10].score + res.values[15].score) / 3) * 100) / 100
        res.higherOrderValues[4].score = Math.round(((res.values[12].score + res.values[14].score + res.values[7].score) / 3) * 100) / 100
        res.higherOrderValues[5].score = Math.round(((res.values[8].score + res.values[16].score + res.values[24].score) / 3) * 100) / 100

        return res
    }
}
