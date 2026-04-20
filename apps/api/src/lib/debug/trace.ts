export function trace(tag: string, data: Record<string, any> = {}) {
  const id = Math.random().toString(36).slice(2, 8);

  const payload = {
    id,
    time: new Date().toISOString(),
    tag,
    ...data,
  };

  console.log("🔥 ONEAI TRACE", payload);

  return id;
}