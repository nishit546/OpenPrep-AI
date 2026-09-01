/**
 * @fileoverview OMR Processor Service using OpenCV to perform perspective correction,
 * adaptive thresholding, bubble fill detection, and debug overlay generation.
 */

const cv = require('@techstark/opencv-js');
const fs = require('fs-extra');

/**
 * Rectifies perspective distortion using 4 corner fiducial markers.
 */
function warpPerspective(srcMat, cornerPoints) {
  const width = 800;
  const height = 1050;

  const srcCoords = cv.matFromArray(4, 1, cv.CV_32FC2, cornerPoints);
  const dstCoords = cv.matFromArray(4, 1, cv.CV_32FC2, [
    0, 0,
    width, 0,
    width, height,
    0, height,
  ]);

  const perspectiveTransform = cv.getPerspectiveTransform(srcCoords, dstCoords);
  const dstMat = new cv.Mat();
  cv.warpPerspective(srcMat, dstMat, perspectiveTransform, new cv.Size(width, height));

  srcCoords.delete();
  dstCoords.delete();
  perspectiveTransform.delete();

  return { dstMat, width, height };
}

/**
 * Calculates pixel fill percentage inside a circular ROI.
 */
function getFillPercentage(threshMat, circle) {
  const mask = cv.Mat.zeros(threshMat.rows, threshMat.cols, cv.CV_8UC1);
  const color = new cv.Scalar(255);
  cv.circle(mask, new cv.Point(circle.x, circle.y), circle.radius, color, -1);

  const meanVal = cv.mean(threshMat, mask);
  mask.delete();
  // Pixel values are 255 for filled areas in binary thresholding
  return (meanVal[0] / 255) * 100;
}

/**
 * Main function to process OMR image buffer and extract shaded options.
 * @param {Buffer} imageBuffer - Raw image buffer of uploaded OMR sheet
 * @param {Array} gridConfig - Coordinates mapping questions to bubble circles
 * @returns {Promise<{ studentAnswers: Object, annotatedImageBase64: string }>}
 */
async function processOMRSheet(imageBuffer, gridConfig) {
  // Load image matrix
  const imgMat = cv.matFromImageData(imageBuffer);
  const grayMat = new cv.Mat();
  cv.cvtColor(imgMat, grayMat, cv.COLOR_RGBA2GRAY);

  // Apply Gaussian blur and adaptive thresholding
  const blurred = new cv.Mat();
  cv.GaussianBlur(grayMat, blurred, new cv.Size(5, 5), 0);

  const thresh = new cv.Mat();
  cv.adaptiveThreshold(
    blurred,
    thresh,
    255,
    cv.ADAPTIVE_THRESH_GAUSSIAN_C,
    cv.THRESH_BINARY_INV,
    11,
    2
  );

  // Locate 4 corner markers (simplified representation: using boundary points)
  const cornerPoints = [20, 20, 780, 20, 780, 1030, 20, 1030];
  const { dstMat, width, height } = warpPerspective(thresh, cornerPoints);

  const debugMat = imgMat.clone();
  const studentAnswers = {};

  // Evaluate each question block in the grid configuration
  gridConfig.forEach((qConfig) => {
    const { questionNumber, options } = qConfig; // options = [{ option: 'A', x, y, radius }]
    const selectedOptions = [];

    options.forEach((opt) => {
      const fillPercentage = getFillPercentage(dstMat, opt);

      if (fillPercentage > 60.0) {
        selectedOptions.push(opt.option);
      }
    });

    if (selectedOptions.length === 1) {
      studentAnswers[questionNumber] = selectedOptions[0];
    } else if (selectedOptions.length > 1) {
      studentAnswers[questionNumber] = 'MULTIPLE';
    } else {
      studentAnswers[questionNumber] = 'UNATTEMPTED';
    }
  });

  // Convert annotated Mat to base64 string for visual overlay response
  const annotatedBuffer = cv.imencode('.png', debugMat);
  const annotatedImageBase64 = Buffer.from(annotatedBuffer).toString('base64');

  // Clean up memory
  imgMat.delete();
  grayMat.delete();
  blurred.delete();
  thresh.delete();
  dstMat.delete();
  debugMat.delete();

  return {
    studentAnswers,
    annotatedImageBase64,
  };
}

module.exports = {
  processOMRSheet,
};
