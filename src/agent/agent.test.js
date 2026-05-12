import { jest } from '@jest/globals';

const mockDecideNextStep = jest.fn();

const mockTools = {
  sendEmail: jest.fn(),
  analyzeEmail: jest.fn()
};

await jest.unstable_mockModule('./decision.js', () => ({
  decideNextStep: mockDecideNextStep
}));

await jest.unstable_mockModule('./tools.js', () => ({
  tools: mockTools
}));

const { runAgent } = await import('./agent.js');

describe('runAgent', () => {
  let consoleSpy;

  beforeEach(() => {
    jest.clearAllMocks();

    consoleSpy = jest
      .spyOn(console, 'log')
      .mockImplementation(() => { });
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  test('should complete when action is done', async () => {
    mockDecideNextStep.mockResolvedValue({
      action: 'done'
    });

    await runAgent('test email');

    expect(mockDecideNextStep).toHaveBeenCalledTimes(1);

    expect(console.log).toHaveBeenCalledWith(
      '✅ Agent completed'
    );
  });

  test('should execute analyzeEmail tool', async () => {
    mockDecideNextStep
      .mockResolvedValueOnce({
        action: 'analyzeEmail',
        input: {
          text: 'hello'
        }
      })
      .mockResolvedValueOnce({
        action: 'done'
      });

    mockTools.analyzeEmail.mockResolvedValue({
      success: true
    });

    await runAgent('test email');

    expect(mockTools.analyzeEmail).toHaveBeenCalledWith({
      text: 'hello'
    });

    expect(console.log).toHaveBeenCalledWith(
      '✅ Agent completed'
    );
  });

  test('should handle missing html for sendEmail', async () => {
    mockDecideNextStep.mockResolvedValue({
      action: 'sendEmail',
      input: {}
    });

    await runAgent('test email');

    expect(console.log).toHaveBeenCalledWith(
      '❌ Missing html, forcing recompute with updated context'
    );

    expect(console.log).toHaveBeenCalledWith(
      '✅ Agent completed'
    );
  });

  test('should handle unknown tool', async () => {
    mockDecideNextStep.mockResolvedValue({
      action: 'unknownTool',
      input: {}
    });

    await runAgent('test email');

    expect(console.log).toHaveBeenCalledWith(
      'Unknown tool:',
      'unknownTool'
    );

    expect(console.log).toHaveBeenCalledWith(
      '✅ Agent completed'
    );
  });
  
  test('should execute sendEmail tool when html exists', async () => {
  mockDecideNextStep
    .mockResolvedValueOnce({
      action: 'sendEmail',
      input: {
        html: '<h1>Hello</h1>'
      }
    })
    .mockResolvedValueOnce({
      action: 'done'
    });

  mockTools.sendEmail.mockResolvedValue({
    success: true
  });

  await runAgent('test email');

  expect(mockTools.sendEmail).toHaveBeenCalledWith({
    html: '<h1>Hello</h1>'
  });

  expect(console.log).toHaveBeenCalledWith(
    '✅ Agent completed'
  );
});
});