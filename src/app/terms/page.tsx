"use client";

import Link from "next/link";

const sectionHeadingStyle: React.CSSProperties = {
  fontSize: 20,
  fontWeight: 700,
  color: "#14532d",
  marginTop: 32,
  marginBottom: 12,
};

const bodyStyle: React.CSSProperties = {
  fontSize: 15,
  lineHeight: 1.7,
  color: "#374151",
  marginBottom: 16,
};

const listStyle: React.CSSProperties = {
  fontSize: 15,
  lineHeight: 1.7,
  color: "#374151",
  marginBottom: 16,
  paddingLeft: 24,
};

export default function TermsOfUsePage() {
  return (
    <div style={{ minHeight: "100vh", background: "#fefbf6" }}>
      {/* Green header */}
      <div
        style={{
          background: "linear-gradient(135deg, #14532d, #2d6a4f)",
          padding: "32px 0",
        }}
      >
        <div style={{ maxWidth: 900, margin: "0 auto", padding: "0 24px" }}>
          <Link
            href="/"
            style={{ color: "#d1fae5", textDecoration: "none", fontSize: 14 }}
          >
            &larr; Back to AyurGate
          </Link>
          <h1 style={{ color: "white", fontSize: 32, marginTop: 12, marginBottom: 4 }}>
            Terms of Use
          </h1>
          <p style={{ color: "#a7f3d0", fontSize: 14, margin: 0 }}>
            Last updated: April 2026
          </p>
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth: 900, margin: "0 auto", padding: "40px 24px 80px" }}>
        <p style={bodyStyle}>
          Welcome to AyurGate. These Terms of Use (&quot;Terms&quot;) govern your access to and
          use of the AyurGate platform, including our website at www.ayurgate.com, web
          application, mobile applications, and all related services (collectively, the
          &quot;Service&quot;). By accessing or using the Service, you agree to be bound by these
          Terms. If you do not agree to these Terms, you must not use the Service.
        </p>

        {/* 1. Acceptance of Terms */}
        <h2 style={sectionHeadingStyle}>1. Acceptance of Terms</h2>
        <p style={bodyStyle}>
          By creating an account, accessing, or using any part of the AyurGate platform, you
          acknowledge that you have read, understood, and agree to be bound by these Terms of
          Use and our{" "}
          <Link href="/privacy" style={{ color: "#2d6a4f", textDecoration: "underline" }}>
            Privacy Policy
          </Link>
          , which is incorporated herein by reference. These Terms constitute a legally binding
          agreement between you (or the entity you represent) and AyurGate. If you are
          accepting these Terms on behalf of a clinic, practice, or other legal entity, you
          represent and warrant that you have the authority to bind that entity to these Terms.
        </p>

        {/* 2. Description of Service */}
        <h2 style={sectionHeadingStyle}>2. Description of Service</h2>
        <p style={bodyStyle}>
          AyurGate is a cloud-based clinic management platform designed for Ayurveda, wellness,
          and healthcare practices. The Service provides tools and features including, but not
          limited to:
        </p>
        <ul style={listStyle}>
          <li>Patient registration and health record management</li>
          <li>Appointment scheduling and calendar management</li>
          <li>Billing, invoicing, and payment processing</li>
          <li>Prescription creation and management</li>
          <li>Inventory and stock management for medicines and products</li>
          <li>Staff management, roles, and access control</li>
          <li>Multi-branch and multi-location support</li>
          <li>Reporting and analytics dashboards</li>
          <li>Patient communication tools</li>
          <li>Online booking portal for patients</li>
        </ul>
        <p style={bodyStyle}>
          AyurGate reserves the right to modify, update, or discontinue any feature of the
          Service at any time. We will provide reasonable notice for any material changes that
          affect your use of the Service.
        </p>

        {/* 3. Account Registration */}
        <h2 style={sectionHeadingStyle}>3. Account Registration</h2>
        <p style={bodyStyle}>
          To use the Service, you must create an account and provide accurate, complete, and
          current information during the registration process. You agree to the following:
        </p>
        <ul style={listStyle}>
          <li>
            Each clinic or practice must designate one primary administrator (&quot;Admin&quot;)
            who is responsible for managing the account, including granting and revoking access
            for team members.
          </li>
          <li>
            You are responsible for maintaining the confidentiality of your account credentials,
            including your password. You must not share your login credentials with any third
            party.
          </li>
          <li>
            You are responsible for all activities that occur under your account, whether or not
            authorised by you. You must notify AyurGate immediately at support@ayurgate.com if
            you suspect any unauthorised use of your account.
          </li>
          <li>
            You must ensure that all information provided during registration and throughout
            your use of the Service remains accurate and up to date. AyurGate reserves the
            right to suspend or terminate accounts that contain materially inaccurate
            information.
          </li>
          <li>
            You must be at least 18 years of age to create an account and use the Service.
          </li>
        </ul>

        {/* 4. Subscription & Payment */}
        <h2 style={sectionHeadingStyle}>4. Subscription and Payment</h2>
        <p style={bodyStyle}>
          AyurGate offers a 7-day free trial for new accounts, allowing you to explore the full
          functionality of the platform before committing to a paid subscription. No credit
          card is required for the trial period.
        </p>
        <ul style={listStyle}>
          <li>
            <strong>Subscription Plans:</strong> After the trial period, continued use of the
            Service requires an active paid subscription. Subscription plans, pricing, and
            included features are detailed on our pricing page and may be updated from time to
            time.
          </li>
          <li>
            <strong>Auto-Renewal:</strong> All subscriptions automatically renew at the end of
            each billing cycle (monthly or annually, depending on your chosen plan) unless you
            cancel before the renewal date. You will be charged the applicable subscription fee
            at the beginning of each renewal period.
          </li>
          <li>
            <strong>Cancellation:</strong> You may cancel your subscription at any time through
            your account settings. Cancellation takes effect at the end of your current billing
            period. No refunds will be issued for partial billing periods.
          </li>
          <li>
            <strong>Payment Processing:</strong> All payments are processed securely through
            Stripe. AyurGate does not store your credit card or payment card details on our
            servers.
          </li>
          <li>
            <strong>Price Changes:</strong> AyurGate reserves the right to adjust pricing with
            at least 30 days&apos; written notice. Price changes will take effect at the
            beginning of your next billing cycle following the notice period.
          </li>
        </ul>

        {/* 5. Data Ownership */}
        <h2 style={sectionHeadingStyle}>5. Data Ownership</h2>
        <p style={bodyStyle}>
          Your data belongs to you. AyurGate recognises that the data you enter into the
          platform &mdash; including patient records, appointment information, billing data,
          prescriptions, inventory records, and all other business data &mdash; is and remains
          the property of your clinic or practice.
        </p>
        <ul style={listStyle}>
          <li>
            <strong>Data Processor:</strong> AyurGate acts as a data processor on your behalf.
            We process your data solely for the purpose of providing and improving the Service.
            We do not claim ownership of any data you submit to the platform.
          </li>
          <li>
            <strong>Data Export:</strong> You may export your data at any time using the export
            tools available within the platform. We believe in data portability and will assist
            you in exporting your data upon request.
          </li>
          <li>
            <strong>No Sale of Data:</strong> AyurGate will never sell, rent, or lease your
            data to third parties for any purpose, including marketing or advertising.
          </li>
        </ul>

        {/* 6. Acceptable Use */}
        <h2 style={sectionHeadingStyle}>6. Acceptable Use</h2>
        <p style={bodyStyle}>
          You agree to use the Service only for its intended purpose and in compliance with all
          applicable laws and regulations. The following activities are strictly prohibited:
        </p>
        <ul style={listStyle}>
          <li>
            Using the Service for any unlawful, fraudulent, or malicious purpose, including but
            not limited to violating healthcare regulations, data protection laws, or
            professional licensing requirements.
          </li>
          <li>
            Sharing, disclosing, or transferring your account credentials to any unauthorised
            third party. Each user must have their own unique login.
          </li>
          <li>
            Scraping, crawling, or using automated tools to extract data from the platform
            without prior written consent from AyurGate.
          </li>
          <li>
            Attempting to reverse engineer, decompile, disassemble, or otherwise derive the
            source code of the platform or any part thereof.
          </li>
          <li>
            Copying, exporting, or storing patient data outside of the platform in any manner
            that violates applicable data protection laws (such as the Singapore PDPA) or that
            compromises the security or confidentiality of patient information.
          </li>
          <li>
            Uploading or transmitting any content that contains viruses, malware, or other
            harmful code designed to disrupt or damage the Service.
          </li>
          <li>
            Using the Service in a manner that imposes an unreasonable or disproportionately
            large load on our infrastructure.
          </li>
        </ul>
        <p style={bodyStyle}>
          AyurGate reserves the right to suspend or terminate your account if we reasonably
          determine that you have violated any of these acceptable use provisions.
        </p>

        {/* 7. Healthcare Disclaimer */}
        <h2 style={sectionHeadingStyle}>7. Healthcare Disclaimer</h2>
        <p style={bodyStyle}>
          AyurGate is a practice management and administrative tool. It is not intended to
          provide medical advice, diagnosis, or treatment recommendations.
        </p>
        <ul style={listStyle}>
          <li>
            All clinical decisions, including diagnosis, treatment plans, prescriptions, and
            patient care strategies, are the sole responsibility of the licensed healthcare
            practitioner using the platform.
          </li>
          <li>
            AyurGate does not verify, validate, or endorse any clinical data, prescription
            details, or treatment information entered into the platform by users.
          </li>
          <li>
            The Service is not a substitute for professional medical judgment, clinical
            training, or regulatory compliance. Practitioners must rely on their own
            professional expertise and applicable clinical guidelines.
          </li>
          <li>
            AyurGate shall not be held liable for any adverse outcomes, medical errors, or
            patient harm arising from clinical decisions made by users of the platform.
          </li>
        </ul>

        {/* 8. Uptime & Availability */}
        <h2 style={sectionHeadingStyle}>8. Uptime and Availability</h2>
        <p style={bodyStyle}>
          AyurGate strives to maintain a high standard of availability and targets 99.9% uptime
          for the Service. However, the following conditions apply:
        </p>
        <ul style={listStyle}>
          <li>
            <strong>Planned Maintenance:</strong> We may perform scheduled maintenance from
            time to time to improve the Service. We will provide at least 24 hours&apos; notice
            for planned maintenance windows, and will endeavour to schedule maintenance during
            off-peak hours.
          </li>
          <li>
            <strong>No Guarantee:</strong> While we make commercially reasonable efforts to
            ensure the Service is available at all times, we do not guarantee uninterrupted,
            error-free, or secure access to the Service. Temporary outages may occur due to
            maintenance, updates, infrastructure issues, or events beyond our reasonable
            control.
          </li>
          <li>
            <strong>Force Majeure:</strong> AyurGate shall not be liable for any downtime or
            service interruptions caused by events outside our reasonable control, including but
            not limited to natural disasters, power outages, internet disruptions, cyberattacks,
            or actions by government authorities.
          </li>
        </ul>

        {/* 9. Intellectual Property */}
        <h2 style={sectionHeadingStyle}>9. Intellectual Property</h2>
        <p style={bodyStyle}>
          The AyurGate platform, including all software, code, design, user interfaces,
          graphics, logos, trademarks, trade names, and documentation, is the exclusive
          intellectual property of AyurGate and is protected by applicable intellectual
          property laws.
        </p>
        <ul style={listStyle}>
          <li>
            You are granted a limited, non-exclusive, non-transferable, revocable licence to
            access and use the Service for the duration of your active subscription, solely for
            its intended purpose.
          </li>
          <li>
            You retain full ownership of all data, content, images, and materials you upload to
            or create within the platform.
          </li>
          <li>
            You may not reproduce, distribute, modify, create derivative works of, or publicly
            display any part of the AyurGate platform without our prior written consent.
          </li>
        </ul>

        {/* 10. Limitation of Liability */}
        <h2 style={sectionHeadingStyle}>10. Limitation of Liability</h2>
        <p style={bodyStyle}>
          To the maximum extent permitted by applicable law:
        </p>
        <ul style={listStyle}>
          <li>
            AyurGate, its directors, officers, employees, agents, and affiliates shall not be
            liable for any indirect, incidental, special, consequential, or punitive damages,
            including but not limited to loss of profits, revenue, data, business opportunities,
            or goodwill, arising out of or in connection with your use of or inability to use
            the Service, regardless of the cause of action or the theory of liability (whether
            in contract, tort, negligence, strict liability, or otherwise), even if AyurGate
            has been advised of the possibility of such damages.
          </li>
          <li>
            AyurGate&apos;s total aggregate liability to you for all claims arising out of or
            relating to the Service shall not exceed the total amount of fees paid by you to
            AyurGate during the twelve (12) months immediately preceding the event giving rise
            to the claim.
          </li>
          <li>
            AyurGate does not warrant that the Service will meet all of your requirements, that
            the Service will be uninterrupted, timely, secure, or error-free, or that the
            results obtained from the use of the Service will be accurate or reliable.
          </li>
        </ul>

        {/* 11. Termination */}
        <h2 style={sectionHeadingStyle}>11. Termination</h2>
        <p style={bodyStyle}>
          Either party may terminate this agreement at any time, subject to the following
          conditions:
        </p>
        <ul style={listStyle}>
          <li>
            <strong>By You:</strong> You may terminate your account at any time by cancelling
            your subscription through your account settings or by contacting us at
            support@ayurgate.com. Your access to the Service will continue until the end of
            your current billing period.
          </li>
          <li>
            <strong>By AyurGate:</strong> We may suspend or terminate your account immediately
            if you breach these Terms, engage in prohibited activities, fail to pay applicable
            fees, or if we are required to do so by law. We will provide reasonable notice
            where practicable.
          </li>
          <li>
            <strong>Data After Termination:</strong> Following termination, your data will
            remain accessible for export for a period of 30 days. After this 30-day grace
            period, your data will be permanently deleted from our systems. Backup copies will
            be purged within 90 days of termination.
          </li>
          <li>
            <strong>Survival:</strong> Sections relating to Data Ownership, Limitation of
            Liability, Intellectual Property, and Governing Law shall survive termination of
            this agreement.
          </li>
        </ul>

        {/* 12. Changes to Terms */}
        <h2 style={sectionHeadingStyle}>12. Changes to Terms</h2>
        <p style={bodyStyle}>
          AyurGate reserves the right to modify or update these Terms at any time. When we make
          material changes, we will:
        </p>
        <ul style={listStyle}>
          <li>
            Provide at least 30 days&apos; advance notice via email to the address associated
            with your account.
          </li>
          <li>
            Post the updated Terms on the AyurGate website with a revised &quot;Last
            updated&quot; date.
          </li>
          <li>
            Display a notice within the platform upon your next login following the update.
          </li>
        </ul>
        <p style={bodyStyle}>
          Your continued use of the Service after the effective date of the updated Terms
          constitutes your acceptance of the changes. If you do not agree to the revised Terms,
          you must stop using the Service and terminate your account.
        </p>

        {/* 13. Governing Law */}
        <h2 style={sectionHeadingStyle}>13. Governing Law</h2>
        <p style={bodyStyle}>
          These Terms shall be governed by and construed in accordance with the laws of the
          Republic of Singapore, without regard to its conflict of law provisions. Any disputes
          arising out of or in connection with these Terms or the Service shall be subject to
          the exclusive jurisdiction of the courts of Singapore. Both parties agree to submit to
          the personal jurisdiction of the courts located in Singapore for the purpose of
          resolving any such disputes.
        </p>

        {/* 14. Contact */}
        <h2 style={sectionHeadingStyle}>14. Contact</h2>
        <p style={bodyStyle}>
          If you have any questions, concerns, or feedback regarding these Terms of Use, please
          contact us:
        </p>
        <ul style={listStyle}>
          <li>
            <strong>Email:</strong>{" "}
            <a href="mailto:support@ayurgate.com" style={{ color: "#2d6a4f" }}>
              support@ayurgate.com
            </a>
          </li>
          <li>
            <strong>Website:</strong>{" "}
            <a
              href="https://www.ayurgate.com"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: "#2d6a4f" }}
            >
              www.ayurgate.com
            </a>
          </li>
        </ul>

        <div
          style={{
            marginTop: 48,
            paddingTop: 24,
            borderTop: "1px solid #e5e7eb",
            textAlign: "center",
          }}
        >
          <Link
            href="/privacy"
            style={{ color: "#2d6a4f", textDecoration: "underline", fontSize: 14 }}
          >
            Privacy Policy
          </Link>
          <span style={{ margin: "0 12px", color: "#9ca3af" }}>|</span>
          <Link
            href="/"
            style={{ color: "#2d6a4f", textDecoration: "underline", fontSize: 14 }}
          >
            Back to AyurGate
          </Link>
        </div>
      </div>
    </div>
  );
}
