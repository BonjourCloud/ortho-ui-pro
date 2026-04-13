import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const ADMIN_EMAIL = "itsrajivv@gmail.com";

interface AppointmentData {
  firstName: string;
  lastName: string;
  phone: string;
  email?: string;
  appointmentType: string;
  service?: string;
  preferredDate: string;
  preferredTime: string;
  symptoms: string;
  insuranceProvider?: string;
  emiInterest: boolean;
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const appointmentData: AppointmentData = await req.json();

    // Email to admin
    const adminEmailHtml = `
      <h2>New Appointment Request</h2>
      <p><strong>Patient:</strong> ${appointmentData.firstName} ${appointmentData.lastName}</p>
      <p><strong>Phone:</strong> ${appointmentData.phone}</p>
      <p><strong>Email:</strong> ${appointmentData.email || "Not provided"}</p>
      <p><strong>Appointment Type:</strong> ${appointmentData.appointmentType}</p>
      <p><strong>Service:</strong> ${appointmentData.service || "Not specified"}</p>
      <p><strong>Preferred Date:</strong> ${appointmentData.preferredDate}</p>
      <p><strong>Preferred Time:</strong> ${appointmentData.preferredTime}</p>
      <p><strong>Symptoms:</strong> ${appointmentData.symptoms}</p>
      <p><strong>Insurance:</strong> ${appointmentData.insuranceProvider || "None / Self-pay"}</p>
      <p><strong>EMI Interest:</strong> ${appointmentData.emiInterest ? "Yes" : "No"}</p>
      <hr>
      <p><em>Please confirm this appointment via WhatsApp within 2 hours.</em></p>
    `;

    // Email to patient (if email provided)
    const patientEmailHtml = `
      <h2>Appointment Request Received</h2>
      <p>Dear ${appointmentData.firstName},</p>
      <p>Thank you for booking an appointment with Dr. Srivanth's Orthopedic Clinic.</p>
      <h3>Your Appointment Details:</h3>
      <ul>
        <li><strong>Date:</strong> ${appointmentData.preferredDate}</li>
        <li><strong>Time:</strong> ${appointmentData.preferredTime}</li>
        <li><strong>Type:</strong> ${appointmentData.appointmentType}</li>
        ${appointmentData.service ? `<li><strong>Service:</strong> ${appointmentData.service}</li>` : ""}
      </ul>
      <p><strong>What's Next?</strong></p>
      <p>We will confirm your appointment within 2 hours via WhatsApp at ${appointmentData.phone}.</p>
      <p>If you have any urgent questions, please call us at +91 98765 43210.</p>
      <hr>
      <p><strong>Dr. Srivanth's Orthopedic Clinic</strong><br>
      Chikkadpally, Hyderabad<br>
      Phone: +91 98765 43210</p>
    `;

    const emails = [];

    // Send email to admin
    emails.push({
      from: "OrthoCarehub <appointments@orthocarehub.in>",
      to: [ADMIN_EMAIL],
      subject: `New Appointment: ${appointmentData.firstName} ${appointmentData.lastName} - ${appointmentData.preferredDate}`,
      html: adminEmailHtml,
    });

    // Send confirmation email to patient if email provided
    if (appointmentData.email) {
      emails.push({
        from: "OrthoCarehub <appointments@orthocarehub.in>",
        to: [appointmentData.email],
        subject: "Appointment Request Received - Dr. Srivanth's Orthopedic Clinic",
        html: patientEmailHtml,
      });
    }

    // Send emails via Resend
    const responses = await Promise.all(
      emails.map((email) =>
        fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${RESEND_API_KEY}`,
          },
          body: JSON.stringify(email),
        })
      )
    );

    const results = await Promise.all(responses.map((r) => r.json()));

    return new Response(JSON.stringify({ success: true, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Error sending email:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
