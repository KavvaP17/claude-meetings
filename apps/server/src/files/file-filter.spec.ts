import { isAllowedMeetingFile } from './file-filter';

describe('isAllowedMeetingFile', () => {
  it.each([
    ['audio/mpeg', 'recording.mp3'],
    ['audio/wav', 'recording.wav'],
    ['audio/x-m4a', 'recording.m4a'],
    ['video/mp4', 'recording.mp4'],
  ])('accepts %s files with a %s extension', (mimetype, originalname) => {
    expect(isAllowedMeetingFile({ mimetype, originalname })).toBe(true);
  });

  it('rejects a disallowed extension even with an allowed mimetype', () => {
    expect(isAllowedMeetingFile({ mimetype: 'audio/mpeg', originalname: 'malware.exe' })).toBe(
      false,
    );
  });

  it('rejects a disallowed mimetype even with an allowed extension', () => {
    expect(
      isAllowedMeetingFile({ mimetype: 'application/octet-stream', originalname: 'track.mp3' }),
    ).toBe(false);
  });

  it('is case-insensitive on the extension', () => {
    expect(isAllowedMeetingFile({ mimetype: 'audio/mpeg', originalname: 'RECORDING.MP3' })).toBe(
      true,
    );
  });
});
