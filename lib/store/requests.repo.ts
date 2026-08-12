import { randomUUID } from "node:crypto";
import { mutate, readDb } from "@/lib/store/db";
import type {
  AdminDecision,
  Coordinates,
  PlaceRequest,
  PlaceRequestInput,
  RequestStatus,
} from "@/lib/types";

function toCoordinates(
  lat: PlaceRequestInput["lat"],
  lng: PlaceRequestInput["lng"],
): Coordinates | undefined {
  if (typeof lat === "number" && typeof lng === "number" && Number.isFinite(lat) && Number.isFinite(lng)) {
    return { lat, lng };
  }
  return undefined;
}

export async function listRequests(status?: RequestStatus): Promise<PlaceRequest[]> {
  const db = await readDb();
  const items = status ? db.requests.filter((r) => r.status === status) : db.requests;
  return [...items].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function getRequest(id: string): Promise<PlaceRequest | undefined> {
  const db = await readDb();
  return db.requests.find((r) => r.id === id);
}

export async function getApprovedRequests(): Promise<PlaceRequest[]> {
  return listRequests("approved");
}

export async function createRequest(input: PlaceRequestInput): Promise<PlaceRequest> {
  const now = new Date().toISOString();
  const request: PlaceRequest = {
    id: randomUUID(),
    name: input.name,
    area: input.area,
    category: input.category,
    whySpecial: input.whySpecial,
    coordinates: toCoordinates(input.lat, input.lng),
    photoUrls: input.photoUrls ?? [],
    submittedBy: input.submittedBy?.trim() || "Guest",
    status: "pending",
    createdAt: now,
  };
  return mutate((db) => {
    db.requests.push(request);
    return request;
  });
}

export async function decideRequest(
  id: string,
  decision: AdminDecision,
): Promise<PlaceRequest | undefined> {
  return mutate((db) => {
    const req = db.requests.find((r) => r.id === id);
    if (!req) return undefined;
    req.status = decision.action === "approve" ? "approved" : "rejected";
    req.adminNote = decision.adminNote?.trim() || undefined;
    if (decision.coordinates) req.coordinates = decision.coordinates;
    req.decidedAt = new Date().toISOString();
    return req;
  });
}

export async function deleteRequest(id: string): Promise<boolean> {
  return mutate((db) => {
    const before = db.requests.length;
    db.requests = db.requests.filter((r) => r.id !== id);
    return db.requests.length < before;
  });
}
