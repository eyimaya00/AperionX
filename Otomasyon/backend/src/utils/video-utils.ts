import { exec } from 'child_process';
import { logger } from './logger';
import fs from 'fs';
import path from 'path';

/**
 * Muxes a video file and an audio file into a single MP4 file using ffmpeg.
 * 
 * @param videoPath Path to the video-only file (.v.mp4)
 * @param audioPath Path to the audio-only file (.a.m4a)
 * @param outputPath Path where the muxed video should be saved
 * @returns Promise that resolves when muxing is complete
 */
export async function muxVideoAndAudio(videoPath: string, audioPath: string, outputPath: string): Promise<void> {
    return new Promise((resolve, reject) => {
        if (!fs.existsSync(videoPath)) {
            return reject(new Error(`Video file not found: ${videoPath}`));
        }
        if (!fs.existsSync(audioPath)) {
            return reject(new Error(`Audio file not found: ${audioPath}`));
        }

        // ffmpeg -i video.mp4 -i audio.m4a -c copy -map 0:v:0 -map 1:a:0 output.mp4
        // -c copy is used to skip re-encoding for speed and quality preservation
        const command = `ffmpeg -y -i "${videoPath}" -i "${audioPath}" -c copy -map 0:v:0 -map 1:a:0 "${outputPath}"`;

        logger.info(`Starting muxing: ${path.basename(videoPath)} + ${path.basename(audioPath)} -> ${path.basename(outputPath)}`);

        exec(command, (error, stdout, stderr) => {
            if (error) {
                logger.error(`Ffmpeg muxing error: ${error.message}`);
                return reject(error);
            }
            logger.info(`Successfully muxed: ${outputPath}`);
            resolve();
        });
    });
}
