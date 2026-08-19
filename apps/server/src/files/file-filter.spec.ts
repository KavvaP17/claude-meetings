import { isAllowedMeetingFile } from './file-filter';

const ALLOWED_MIME_TYPES = ['audio/mpeg', 'audio/wav', 'audio/x-m4a', 'video/mp4'];
const ALLOWED_EXTENSIONS = ['.mp3', '.wav', '.m4a', '.mp4'];

function isAllowed(mimetype: string, originalname: string): boolean {
  return isAllowedMeetingFile({ mimetype, originalname }, ALLOWED_MIME_TYPES, ALLOWED_EXTENSIONS);
}

describe('isAllowedMeetingFile', () => {
  it.each([
    ['audio/mpeg', 'recording.mp3'],
    ['audio/wav', 'recording.wav'],
    ['audio/x-m4a', 'recording.m4a'],
    ['video/mp4', 'recording.mp4'],
  ])('accepts %s files with a %s extension', (mimetype, originalname) => {
    expect(isAllowed(mimetype, originalname)).toBe(true);
  });

  it('rejects a disallowed extension even with an allowed mimetype', () => {
    expect(isAllowed('audio/mpeg', 'malware.exe')).toBe(false);
  });

  it('rejects a disallowed mimetype even with an allowed extension', () => {
    expect(isAllowed('application/octet-stream', 'track.mp3')).toBe(false);
  });

  it('is case-insensitive on the extension', () => {
    expect(isAllowed('audio/mpeg', 'RECORDING.MP3')).toBe(true);
  });
});
