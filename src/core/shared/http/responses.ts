import { NextResponse } from 'next/server';

export const ok = <T>(data: T, init?: ResponseInit) => NextResponse.json(data, { status: 200, ...init });

export const created = <T>(data: T, location: string) =>
  NextResponse.json(data, { status: 201, headers: { Location: location } });

export const accepted = <T>(data: T) => NextResponse.json(data, { status: 202 });

export const noContent = () => new NextResponse(null, { status: 204 });
