import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireProfile } from "@/lib/auth/session";
import { getDefaultModuleByRole } from "@/lib/workspace/config";
import { buildMeetingUrl } from "@/lib/telemedicine/meeting";

type PageProps = {
  params: Promise<{ appointmentId: string }>;
};

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function statusLabel(value: string) {
  return value.replaceAll("_", " ");
}

export default async function TeleconsultRoomPage({ params }: PageProps) {
  const { appointmentId } = await params;
  const currentPath = `/workspace/call/${appointmentId}`;
  const { supabase, user, profile } = await requireProfile(currentPath);

  const { data: appointment, error } = await supabase
    .from("appointments")
    .select("id,patient_id,provider_id,scheduled_at,status,reason,meeting_url")
    .eq("id", appointmentId)
    .maybeSingle();

  if (error || !appointment) {
    notFound();
  }

  if (
    profile.role !== "admin" &&
    appointment.patient_id !== user.id &&
    appointment.provider_id !== user.id
  ) {
    redirect(`/workspace/${profile.role}/${getDefaultModuleByRole(profile.role)}`);
  }

  const meetingUrl = appointment.meeting_url ?? buildMeetingUrl(appointment.id);

  return (
    <main className="prototype-bg min-h-[calc(100vh-64px)] px-3 py-4 sm:px-6 sm:py-6">
      <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-4 animate-rise">
        <section className="rounded-3xl border border-cyan-100/80 bg-white/85 p-4 shadow-[0_24px_90px_-55px_rgba(8,60,80,0.75)] backdrop-blur sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold tracking-[0.16em] text-cyan-700">LIVE TELECONSULT</p>
              <h1 className="mt-2 text-2xl font-bold text-slate-900 sm:text-3xl">
                Appointment {appointment.id.slice(0, 8)}
              </h1>
              <p className="mt-1 text-sm text-slate-600">
                Scheduled {formatDateTime(appointment.scheduled_at)} | Status {statusLabel(appointment.status)}
              </p>
              {appointment.reason ? (
                <p className="mt-1 text-sm text-slate-700">Reason: {appointment.reason}</p>
              ) : null}
            </div>
            <div className="flex flex-wrap gap-2">
              <Link
                href={`/workspace/${profile.role}/${getDefaultModuleByRole(profile.role)}`}
                className="inline-flex rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700"
              >
                Back to Workspace
              </Link>
              <a
                href={meetingUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex rounded-lg bg-gradient-to-r from-cyan-600 to-blue-600 px-3 py-2 text-xs font-semibold text-white shadow-[0_10px_26px_-14px_rgba(8,145,178,0.9)]"
              >
                Open in New Tab
              </a>
            </div>
          </div>
        </section>

        <section className="overflow-hidden rounded-3xl border border-cyan-100/80 bg-white/90 shadow-[0_30px_100px_-60px_rgba(15,23,42,0.9)] backdrop-blur">
          <div className="border-b border-cyan-100 bg-cyan-50/70 px-4 py-2 text-xs font-semibold tracking-[0.12em] text-cyan-800">
            SECURE VIDEO ROOM
          </div>
          <iframe
            title={`Teleconsult ${appointment.id}`}
            src={meetingUrl}
            className="h-[75vh] w-full bg-slate-950"
            allow="camera; microphone; fullscreen; display-capture; autoplay"
          />
        </section>
      </div>
    </main>
  );
}
