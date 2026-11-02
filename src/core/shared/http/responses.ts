import { NextResponse } from 'next/server';

export const ok = <T>(data: T, init?: ResponseInit) => NextResponse.json(data, { status: 200, ...init });

export const created = <T>(data: T, location: string) =>
  NextResponse.json(data, { status: 201, headers: { Location: location } });

// 202 Accepted: con `location` el trabajo quedó en cola y ahí se consulta
export const accepted = <T>(data: T, location?: string) =>
  NextResponse.json(data, { status: 202, headers: location ? { Location: location, 'Cache-Control': 'no-store' } : undefined });

export const noContent = () => new NextResponse(null, { status: 204 });
