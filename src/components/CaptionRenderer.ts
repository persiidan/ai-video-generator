import { WordTimestamp } from '@/types';

export interface CaptionGroup {
  words: string[];
  startTime: number;
  endTime: number;
  text: string;
}

export interface CaptionFrame {
  text: string;
  startTime: number;
  endTime: number;
  duration: number;
}

/**
 * Group word timestamps into 3-word chunks for caption display
 */
export function groupWordsIntoCaptions(
  wordTimestamps: WordTimestamp[],
  maxWordsPerCaption: number = 3
): CaptionGroup[] {
  if (wordTimestamps.length === 0) return [];

  const groups: CaptionGroup[] = [];
  let currentGroup: CaptionGroup | null = null;

  for (let i = 0; i < wordTimestamps.length; i++) {
    const word = wordTimestamps[i];
    
    // Start a new group if:
    // 1. No current group exists
    // 2. Current group has reached max words
    // 3. There's a significant gap between words (> 1 second)
    const shouldStartNewGroup = 
      !currentGroup || 
      currentGroup.words.length >= maxWordsPerCaption ||
      (currentGroup && word.startTime - currentGroup.endTime > 1.0);

    if (shouldStartNewGroup) {
      // Save previous group if it exists
      if (currentGroup) {
        groups.push(currentGroup);
      }
      
      // Start new group
      currentGroup = {
        words: [word.word],
        startTime: word.startTime,
        endTime: word.endTime,
        text: word.word
      };
    } else {
      // Add to current group
      currentGroup!.words.push(word.word);
      currentGroup!.endTime = word.endTime;
      currentGroup!.text = currentGroup!.words.join(' ');
    }
  }

  // Add the last group
  if (currentGroup) {
    groups.push(currentGroup);
  }

  return groups;
}

/**
 * Create caption frames for video composition
 */
export function createCaptionFrames(
  captionGroups: CaptionGroup[],
  segmentDuration: number
): CaptionFrame[] {
  return captionGroups.map(group => ({
    text: group.text,
    startTime: group.startTime,
    endTime: group.endTime,
    duration: group.endTime - group.startTime
  }));
}

/**
 * Get the current caption text based on playback time
 */
export function getCurrentCaption(
  captionFrames: CaptionFrame[],
  currentTime: number
): string {
  const currentFrame = captionFrames.find(frame => 
    currentTime >= frame.startTime && currentTime <= frame.endTime
  );
  
  return currentFrame ? currentFrame.text : '';
}

/**
 * Validate caption timing against audio duration
 */
export function validateCaptionTiming(
  captionGroups: CaptionGroup[],
  audioDuration: number
): boolean {
  if (captionGroups.length === 0) return false;
  
  const lastGroup = captionGroups[captionGroups.length - 1];
  const timingError = Math.abs(lastGroup.endTime - audioDuration);
  
  // Allow 0.5 second tolerance
  return timingError <= 0.5;
}

/**
 * Adjust caption timing to match audio duration
 */
export function adjustCaptionTiming(
  captionGroups: CaptionGroup[],
  audioDuration: number
): CaptionGroup[] {
  if (captionGroups.length === 0) return captionGroups;
  
  const lastGroup = captionGroups[captionGroups.length - 1];
  const timingError = audioDuration - lastGroup.endTime;
  
  if (Math.abs(timingError) > 0.1) {
    // Adjust the last group's end time
    const adjustedGroups = [...captionGroups];
    adjustedGroups[adjustedGroups.length - 1] = {
      ...lastGroup,
      endTime: audioDuration
    };
    return adjustedGroups;
  }
  
  return captionGroups;
} 