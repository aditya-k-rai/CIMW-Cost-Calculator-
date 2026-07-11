/**
 * Fetches District and State from the Indian Postal Pincode API
 */
export async function lookupPincode(pincode: string): Promise<{ district: string; state: string } | null> {
  if (!/^\d{6}$/.test(pincode)) return null;
  try {
    const res = await fetch(`https://api.postalpincode.in/pincode/${pincode}`);
    if (!res.ok) return null;
    const data = await res.json();
    if (data && data[0] && data[0].Status === "Success" && data[0].PostOffice?.length > 0) {
      const postOffice = data[0].PostOffice[0];
      return {
        district: postOffice.District,
        state: postOffice.State
      };
    }
  } catch (e) {
    console.error("Pincode lookup error:", e);
  }
  return null;
}
