import * as request from 'supertest';
import { app, setUpServer, tearDownServer } from './setup.e2e-spect';

const gql = '/graphql';
let accessToken: string;
let id: string;
let projectid: string;

describe('Issues', () => {
  beforeAll(async () => {
    await setUpServer();
  });

  afterAll(async () => {
    await tearDownServer();
  });

  it('Registration', async () => {
    return request(app.getHttpServer())
      .post(gql)
      .send({
        query:
          'mutation Register($user: UserInput!) {register(user: $user) {created id lastUpdated name}}',
        variables: {
          user: {
            email: 'test@test.com',
            name: 'Test',
            password: 'Test@Pass1',
            username: 'Test',
          },
        },
        operationName: 'Register',
      })
      .expect(200)
      .expect(({ body }) => {
        expect(body.data.register.name).toBe('Test');
      });
  });

  it('Login', async () => {
    return request(app.getHttpServer())
      .post(gql)
      .send({
        operationName: null,
        variables: {},
        query:
          'query {login(login:{email: "test@test.com", password: "Test@Pass1"}) {id name accessToken}}',
      })
      .expect(200)
      .expect(({ body }) => {
        accessToken = body.data.login.accessToken;
        expect(body.data.login.name).toBe('Test');
      });
  });

  it('Create Project', async () => {
    return request(app.getHttpServer())
      .post(gql)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        operationName: null,
        variables: {},
        query:
          'mutation { createProject(project: { description: "first project", type: "YEAH", name: "Yeah" } ) {id }}',
      })
      .expect(200)
      .expect(({ body }) => {
        projectId = body?.data?.createProject.id;
        expect(body?.data?.createProject).toBeDefined();
      });
  });

  it('Get Issues with no pagination', async () => {
    return request(app.getHttpServer())
      .post(gql)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        query:
          'query GetIssues($params: Params!) {getIssues(params: $params) {description elementName epic externalLink}}',
        variables: { params: { id: projectId } },
        operationName: 'GetIssues',
      })
      .expect(200)
      .expect(({ body }) => {
        expect(body?.data?.getIssues?.length).toBe(0);
      });
  });

  it('Create Issues', async () => {
    return request(app.getHttpServer())
      .post(gql)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        query:
          'mutation CreateIssue($issue: IssueInput!) {createIssue(issue: $issue) {completedAt component created id createdBy{created id}}}',
        variables: {
          issue: {
            description: 'Yooszh',
            project: { id: projectId },
            type: 'YOPS',
            epic: 'Neema',
            workstream: 'Use',
            notes: 'Yooh',
            elementName: 'Test',
          },
        },
        operationName: 'CreateIssue',
      })
      .expect(200)
      .expect(({ body }) => {
        id = body?.data?.createIssue.id;
        expect(body?.data?.createIssue).toBeDefined();
      });
  });

  it('Get Issue', async () => {
    return request(app.getHttpServer())
      .post(gql)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        operationName: null,
        variables: {},
        query: `{getIssue(id: ${id}) {id}}`,
      })
      .expect(200)
      .expect(({ body }) => {
        expect(body.data.getIssue.id).toBe(id);
      });
  });
});
