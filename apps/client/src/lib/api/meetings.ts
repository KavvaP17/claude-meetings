import { API_URL, apiFetch, ApiError, extractErrorMessage } from './client';

export interface Meeting {
  id: string;
  title: string;
  date: string;
  participants: string[];
  createdAt: string;
  creatorId: string;
}

export interface MeetingFile {
  id: string;
  fileName: string;
  sizeBytes: number;
  mimeType: string;
  status: string;
  createdAt: string;
  uploadedById: string;
}

export interface MeetingWithFiles extends Meeting {
  files: MeetingFile[];
}

export interface CreateMeetingPayload {
  title: string;
  date: string;
  participants: string[];
}

function authHeaders(accessToken: string): HeadersInit {
  return { Authorization: `Bearer ${accessToken}` };
}

export function getMeetings(accessToken: string): Promise<Meeting[]> {
  return apiFetch<Meeting[]>(
    '/meetings',
    { headers: authHeaders(accessToken) },
    'Failed to load meetings.',
  );
}

export function getMeeting(accessToken: string, id: string): Promise<MeetingWithFiles> {
  return apiFetch<MeetingWithFiles>(
    `/meetings/${id}`,
    { headers: authHeaders(accessToken) },
    'Failed to load meeting.',
  );
}

// XMLHttpRequest, not fetch/apiFetch — only xhr.upload.onprogress gives real upload progress.
export function uploadMeetingFile(
  accessToken: string,
  meetingId: string,
  file: File,
  onProgress: (percent: number) => void,
): Promise<MeetingFile> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const formData = new FormData();
    formData.append('file', file);

    xhr.open('POST', `${API_URL}/meetings/${meetingId}/files`);
    xhr.setRequestHeader('Authorization', `Bearer ${accessToken}`);
    // Content-Type intentionally not set — the browser fills in multipart/form-data with the
    // correct boundary for a FormData body; setting it manually would drop the boundary.

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        onProgress(Math.round((event.loaded / event.total) * 100));
      }
    };

    xhr.onload = () => {
      let body: unknown = null;
      try {
        body = JSON.parse(xhr.responseText);
      } catch {
        body = null;
      }
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(body as MeetingFile);
      } else {
        reject(new ApiError(extractErrorMessage(body, 'Failed to upload file.'), xhr.status));
      }
    };
    xhr.onerror = () => reject(new ApiError('Unable to reach the server. Please try again.', 0));
    xhr.send(formData);
  });
}

export function createMeeting(
  accessToken: string,
  payload: CreateMeetingPayload,
): Promise<Meeting> {
  return apiFetch<Meeting>(
    '/meetings',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders(accessToken) },
      body: JSON.stringify(payload),
    },
    'Failed to create meeting.',
  );
}
