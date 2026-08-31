const { evaluateQuestionQuality } = require('../distractorEvaluator');

describe('Psychometric Distractor Evaluation Engine Tests', () => {
  it('should pass questions that have symmetrical lengths and plausible options', () => {
    const result = evaluateQuestionQuality(
      "What is the primary function of ribosomes in a biological cell structure?",
      "Synthesizing cellular polypeptide protein strands from amino acids.",
      [
        "Modifying lipid chains inside the smooth endoplasmic reticulum matrices.",
        "Breaking down cellular waste products via hydrolytic enzyme arrays.",
        "Generating adenosine triphosphate energy bounds within the cristae."
      ]
    );

    expect(result.passesQualityGate).toBe(true);
    expect(result.metrics.absoluteKeywordDetected).toBe(false);
    expect(result.metrics.isSymmetrical).toBe(true);
  });

  it('should fail options that contain absolute giveaway keywords', () => {
    const result = evaluateQuestionQuality(
      "Which mechanism drives passive diffusion down a concentration gradient?",
      "Kinetic molecular motion alone.",
      [
        "Active transport pumps that always consume large ATP allocations.",
        "None of the above options are correct.",
        "Endocytosis paths that never allow structural solute passage."
      ]
    );

    expect(result.passesQualityGate).toBe(false);
    expect(result.metrics.absoluteKeywordDetected).toBe(true);
  });
});
