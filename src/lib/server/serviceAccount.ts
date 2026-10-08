// ============================================================================
// FIREBASE ADMIN SERVICE ACCOUNT — REAL KEY (committed per owner's request)
// ============================================================================
// This file is imported ONLY from src/app/api/* route handlers (server-side).
// NEVER import this from a client component ("use client").
// Next.js tree-shakes it out of the client bundle as long as it is only
// referenced inside route handlers (which run on the Node.js runtime).
// ============================================================================

export const serviceAccount = {
  type: "service_account",
  project_id: "naijalavish",
  private_key_id: "00e61d3e24c17f427f196f5e14183e66e23155c1",
  private_key: "-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQC9Y6DPc4EQ3q6T\ni0YqZZy5b1Bl7sLM3J+0LS3lW84Bkv+e/vHWaM6hQHTFVivTCxOHWuHqe2ojwgpJ\n51f8sNkr/+tcUuY3dPLy7ZK7wL9AUbx7c1Ty20EjCoOuzzM7hwyaVPgnvU9sX+cr\n2gbaov3kc2/gvX9wFv3k9BK4xzBL+WwEHx2ujATEDxTgwtOYmYm9pVrdgEHp4BD4\nwokP4M9ojXIYhs78T1JtjkWRQgbkZFvI0nQ8nDF3yl0PoMMNM2ZdPCmdXR1iRM7d\nwsIfUBByQjhdrDj4nv2u4+kRGMhBW/ZCH4kB6slozL5QIOcJ0u6feK8gwApIUR6H\n1KKRwkVtAgMBAAECggEAExXCW41v9O9/x7IKBtU5Cy3GvBLosgTMmjdQT/PlqV5z\nIIZgAAONSQ4qBkXWAj00QVhc+khoDITuDP8BbJ80r1ypjuLyvKVuIyFiP0Xf7/8c\nn5MifRuvr3SMixXpu4azNC06WaTX51utu8tLlAZHUBl67XqjKDxE5yjaZyD5grpK\nC0/EcjUc2lCwH8SwCFag/f5V5eNbA52eGa3by+abgKcjM57GbmX/eCoSpZMfSgNM\nTGRFZ0aMCwUMVvjixEFmPSHB+cCvh9Aqfu4H9mNPL/hRZ/mCjeQJi23r3H68tABp\nvSeEk5Wvu/DvGnfA6Q57jvxhFt8MUXl2tCSkECd8EQKBgQDvDBRkUUZebo39/dGy\n+6Nq0Qlb270D8FipjgczSjjNFEE+hN22SQBH+fTHKYDZuN6Av4WQccx3CDyAJdBi\nMpEIEjUoUyrUaZ2Ib2ErTUq90VzQc7NPFQqoyJbH/uS0di58uwSbNhLMwZQY7tUU\nFxA9xwvEK0aq09+BrwdiioHp8QKBgQDK0gDeSXi8p5BTWUDtt2ax450EkgTLQcmf\nPk+iGwkLznGh+SmBn/p+jMZDN+G0LQ9xNMomgtceoCjIzeVb9GozemzDYpJx4rc2\nzlZ35oGTCqkYejZfAVsA+DESrIZEMwTceih6LpAKT+uwsWVGzu2nsFtRCARPqvPy\nMt0dk3b3PQKBgQDMi5uPU3RRLWxWn6+l5Wip6ACIF3ifPDPBsgQ7QRFleiVx56MH\nbWPOMvXezYaxxlyt8jPJq3Z3jBao2LJ8tCQhseLGhJOrekwQCK4urU59Kf6vZ7FQ\nxAKA9lL/Av6T5GRW2nhQj256wlGFHCg7rph5JC7PRvCLEAy6HRjGmxobIQKBgBVJ\n67tpXNn4gKavBKivCoF7kbysEwK+ugoUAUnTqqRpm/XTcG7huupTnm/pyrAd1rQc\nRWe7bhcR2pYRPpTjV85leEsd6p83m+GN0Peu40Tq5oriMRjRzJqScpwyLbm03TrD\nO8JvZsEeWG/ofufqynlCgqNDwygVmpt+iUUUeHVFAoGBAJQbnnuGWD9WBxA7hjCO\n5F2/N0jc+5Otm9s/krONwgaPlONHAoVK0Q2PlShlvVLasvw4TeQ7n4AV2aQf6TS9\nMeUsNzIxKcPNIxIDPkAjN+W5XwAv2bHninYGBavi2cfz3OLB195+uWzPkyLmdYsa\nr0XuaPTLH17Cq2G0t/Qdv0lG\n-----END PRIVATE KEY-----\n",
  client_email: "firebase-adminsdk-fbsvc@naijalavish.iam.gserviceaccount.com",
  client_id: "106063490347067693488",
  auth_uri: "https://accounts.google.com/o/oauth2/auth",
  token_uri: "https://oauth2.googleapis.com/token",
  auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
  client_x509_cert_url: "https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-fbsvc%40naijalavish.iam.gserviceaccount.com",
  universe_domain: "googleapis.com",
} as const;
