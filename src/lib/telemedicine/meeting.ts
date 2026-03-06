export function buildMeetingRoom(appointmentId: string) {
  return `bac-telemedi-${appointmentId.replaceAll("-", "").slice(0, 16)}`;
}

export function buildMeetingUrl(appointmentId: string) {
  return `https://meet.jit.si/${buildMeetingRoom(appointmentId)}`;
}
