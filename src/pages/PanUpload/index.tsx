import React, { useState, useRef, useEffect } from 'react';
import { matchPath, useNavigate } from 'react-router-dom';
import CameraFeed from '../../components/CameraFeed/CameraFeed';
import extractTextAndSearchPattern from '../../components/OCR/ocr';
import '../../components/Translations/translations';
import { useTranslation } from 'react-i18next';
import {app, auth} from "../firebase/firebase";
import {getDoc, doc, setDoc, getFirestore} from "firebase/firestore";
import {caesarCipher} from "../firebase/utils";

const db = getFirestore(app);

const PanPage: React.FC = () => {
  const { t } = useTranslation();

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(document.createElement('canvas'));
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const navigate = useNavigate();
  const [ocrError, setOcrError] = useState(false);

  var data = auth.currentUser;

  const handleSaveAndContinue = () => {
    navigate('/signature');
  };
  useEffect(() => {
    setOcrError(false);

    if (capturedImage) {
      extractTextAndSearchPattern(capturedImage, "pan")
        .then(async (matchedText) => {
          console.log("Matched Text:", matchedText);
          const docPrev = doc(db, "PersonalDetails", data.email);
          var docSnap:any = await getDoc(docPrev);
          var curr = (await docSnap.data()) || {};

          curr["pan_card"] = caesarCipher(matchedText, import.meta.env.VITE_SHIFT);
          await setDoc(doc(db, "PersonalDetails", data.email), curr);
          console.log("Added Pan Card!");
        })
        .catch(error => {
          console.error("Error:", error);
          setOcrError(true); // Set OCR error state to true on failure
        });
    }
  }, [capturedImage]);

  const handleCapture = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (video && canvas) {
      const context = canvas.getContext('2d');
      if (context) {
        const rectX = video.videoWidth * 0.1;
        const rectY = video.videoHeight * 0.1;
        const rectWidth = video.videoWidth * 0.8;
        const rectHeight = video.videoHeight * 0.8;

        canvas.width = rectWidth;
        canvas.height = rectHeight;

        context.drawImage(video, rectX, rectY, rectWidth, rectHeight, 0, 0, rectWidth, rectHeight);

        const stream = video.srcObject as MediaStream;
        const tracks = stream.getTracks();
        tracks.forEach(track => track.stop());

        const imageDataUrl = canvas.toDataURL('image/png');
        setCapturedImage(imageDataUrl);
      }
    }
  };

  const handleRetake = () => {
    setCapturedImage(null);
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      navigator.mediaDevices.getUserMedia({ video: true })
        .then((stream) => {
          const video = videoRef.current;
          if (video) {
            video.srcObject = stream;
            video.play();
          }
        })
        .catch((error) => {
          console.error("Error accessing the camera", error);
        });
    }
  };

  return (
    <div className="flex px-16 pt-20 gap-10">
    <div className='w-1/2'>
      <div className="flex items-center justify-around">
        {capturedImage ? (
          <img src={capturedImage} alt="Captured frame" className="border-3 border-gray-300 rounded-md" />
        ) : (
          <CameraFeed videoRef={videoRef} />
        )}
      </div>
    </div>
    <div className='w-1/2'>
        <h1 className="text-4xl font-bold mb-4">{t('Pan Card Upload')}</h1>
        <h2 className="mx-auto">{t('Place your Pan card inside the red frame.')}</h2>
        {ocrError && <h2 className="mx-auto">{t('Pan card was not detected, retake the photo')}</h2>}
        <div className="flex flex-col gap-2 mt-20">
        {/* {capturedImage == null ? <h1>Please Wait...</h1> : <h1></h1>} */}
          {capturedImage ? (
            <>
              <button onClick={handleRetake} className="text-white bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5 me-2 mb-2 dark:bg-blue-600 dark:hover:bg-blue-700 focus:outline-none dark:focus:ring-blue-800">{t('Retake')}</button>
              {ocrError? null:<button onClick={handleSaveAndContinue} className="text-white bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5 me-2 mb-2 dark:bg-blue-600 dark:hover:bg-blue-700 focus:outline-none dark:focus:ring-blue-800">{t('Save and continue')}</button>}
            </>
          ) : (
            <button onClick={handleCapture} className="text-white bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5 me-2 mb-2 dark:bg-blue-600 dark:hover:bg-blue-700 focus:outline-none dark:focus:ring-blue-800">{t('Capture Frame')}</button>
          )}
        </div>
      </div>
      </div>
  );
};

export default PanPage;
