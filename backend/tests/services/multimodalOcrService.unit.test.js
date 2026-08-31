const { parseDiagramOcr, preprocessDiagramImage } = require('../../services/multimodalOcrService');
const sharp = require('sharp');
const { GoogleGenerativeAI } = require('@google/generative-ai');

vi.mock('sharp', () => {
  const sharpMock = {
    metadata: vi.fn().mockResolvedValue({ format: 'jpeg' }),
    grayscale: vi.fn().mockReturnThis(),
    median: vi.fn().mockReturnThis(),
    threshold: vi.fn().mockReturnThis(),
    resize: vi.fn().mockReturnThis(),
    toBuffer: vi.fn().mockResolvedValue(Buffer.from('processed_image')),
  };
  return vi.fn(() => sharpMock);
});

vi.mock('@google/generative-ai', () => {
  const responseMock = {
    text: vi.fn().mockReturnValue(
      JSON.stringify({
        latex: '$$E = mc^2$$',
        solution: 'Energy equals mass times speed of light squared.',
        conceptTags: ['physics', 'relativity'],
      })
    ),
  };
  const modelMock = {
    generateContent: vi.fn().mockResolvedValue({
      response: responseMock,
    }),
  };
  return {
    GoogleGenerativeAI: vi.fn().mockImplementation(() => ({
      getGenerativeModel: vi.fn().mockReturnValue(modelMock),
    })),
  };
});

describe('Multimodal OCR Service Unit Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('correctly resizes, grayscales, and binarizes images using sharp', async () => {
    const inputBuffer = Buffer.from('raw_image_data');
    const result = await preprocessDiagramImage(inputBuffer);

    expect(sharp).toHaveBeenCalledWith(inputBuffer);
    const mockSharp = sharp();
    expect(mockSharp.grayscale).toHaveBeenCalled();
    expect(mockSharp.median).toHaveBeenCalledWith(3);
    expect(mockSharp.threshold).toHaveBeenCalledWith(128);
    expect(mockSharp.resize).toHaveBeenCalledWith({
      width: 1200,
      height: 1200,
      fit: 'inside',
      withoutEnlargement: true,
    });
    expect(result.toString()).toBe('processed_image');
  });

  it('rejects unsupported image MIME types', async () => {
    const inputBuffer = Buffer.from('raw_image_data');
    await expect(parseDiagramOcr(inputBuffer, 'text/plain')).rejects.toThrow(
      'Invalid MIME type: text/plain'
    );
  });

  it('handles empty responses from Gemini Multimodal API (blurry/unreadable image)', async () => {
    const inputBuffer = Buffer.from('raw_image_data');
    const { GoogleGenerativeAI } = require('@google/generative-ai');
    
    // Override model return to simulate unreadable empty response
    const mockModel = new GoogleGenerativeAI().getGenerativeModel();
    mockModel.generateContent.mockResolvedValue({
      response: {
        text: () => '',
      },
    });

    await expect(parseDiagramOcr(inputBuffer, 'image/jpeg')).rejects.toThrow(
      'Failed to solve handwritten formula / diagram: Received empty response from Gemini Multimodal API'
    );
  });

  it('transcribes complex mathematical structures and diagrams successfully', async () => {
    const inputBuffer = Buffer.from('raw_image_data');
    const result = await parseDiagramOcr(inputBuffer, 'image/png');

    expect(result.success).toBe(true);
    expect(result.latex).toBe('$$E = mc^2$$');
    expect(result.conceptTags).toEqual(['physics', 'relativity']);
  });
});
