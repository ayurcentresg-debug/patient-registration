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

const subHeadingStyle: React.CSSProperties = {
  fontSize: 16,
  fontWeight: 600,
  color: "#1f2937",
  marginTop: 20,
  marginBottom: 8,
};

export default function PrivacyPolicyPage() {
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
            Privacy Policy
          </h1>
          <p style={{ color: "#a7f3d0", fontSize: 14, margin: 0 }}>
            Last updated: April 2026
          </p>
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth: 900, margin: "0 auto", padding: "40px 24px 80px" }}>
        {/* 1. Introduction */}
        <h2 style={sectionHeadingStyle}>1. Introduction</h2>
        <p style={bodyStyle}>
          AyurGate (&quot;we&quot;, &quot;us&quot;, or &quot;our&quot;) is committed to
          protecting the privacy and security of your personal information and the data of your
          patients. As a cloud-based clinic management platform serving Ayurveda, wellness, and
          healthcare practices, we understand the sensitive nature of the data entrusted to us
          and take our responsibility as a data processor seriously.
        </p>
        <p style={bodyStyle}>
          This Privacy Policy explains what information we collect, how we use and protect it,
          and your rights regarding your data. This policy applies to all users of the AyurGate
          platform, including clinic administrators, practitioners, staff members, and patients
          who interact with our services through booking portals or communications.
        </p>
        <p style={bodyStyle}>
          By using AyurGate, you consent to the practices described in this Privacy Policy. We
          encourage you to read this policy carefully and contact us at{" "}
          <a href="mailto:privacy@ayurgate.com" style={{ color: "#2d6a4f" }}>
            privacy@ayurgate.com
          </a>{" "}
          if you have any questions.
        </p>

        {/* 2. Information We Collect */}
        <h2 style={sectionHeadingStyle}>2. Information We Collect</h2>

        <h3 style={subHeadingStyle}>2.1 Account Information</h3>
        <p style={bodyStyle}>
          When you sign up for an AyurGate account, we collect information necessary to create
          and manage your account, including:
        </p>
        <ul style={listStyle}>
          <li>Full name of the account holder and staff members</li>
          <li>Email addresses</li>
          <li>Phone numbers</li>
          <li>Clinic or practice name, address, and registration details</li>
          <li>Professional qualifications and licence numbers (where applicable)</li>
          <li>Role and access level within the organisation</li>
        </ul>

        <h3 style={subHeadingStyle}>2.2 Patient Data</h3>
        <p style={bodyStyle}>
          Patient data is entered into the platform by authorised clinic staff. AyurGate acts
          as a data processor for this information &mdash; the clinic or practice is the data
          controller. Patient data may include:
        </p>
        <ul style={listStyle}>
          <li>Patient name, contact details, date of birth, and identification information</li>
          <li>Medical history, health conditions, allergies, and clinical notes</li>
          <li>Appointment records and visit history</li>
          <li>Prescriptions and treatment plans</li>
          <li>Billing records and payment history</li>
          <li>Consent forms and communications</li>
        </ul>
        <p style={bodyStyle}>
          We do not access, review, or use patient data except as strictly necessary to provide
          the Service, maintain system security, or comply with legal obligations.
        </p>

        <h3 style={subHeadingStyle}>2.3 Usage Data</h3>
        <p style={bodyStyle}>
          We automatically collect certain technical and usage information when you interact
          with the platform, including:
        </p>
        <ul style={listStyle}>
          <li>Pages viewed, features used, and actions taken within the platform</li>
          <li>Device type, operating system, and browser information</li>
          <li>IP address and approximate geographic location</li>
          <li>Login timestamps and session duration</li>
          <li>Error logs and performance metrics</li>
        </ul>
        <p style={bodyStyle}>
          This data is used in aggregate to improve the Service and is not linked to individual
          patient records.
        </p>

        <h3 style={subHeadingStyle}>2.4 Payment Information</h3>
        <p style={bodyStyle}>
          Subscription payments are processed securely through Stripe, our third-party payment
          processor. When you provide payment details, this information is transmitted directly
          to Stripe and is subject to{" "}
          <a
            href="https://stripe.com/privacy"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: "#2d6a4f" }}
          >
            Stripe&apos;s Privacy Policy
          </a>
          . AyurGate does not store, process, or have access to your full credit card number,
          CVV, or other sensitive payment card details. We retain only a transaction reference,
          the last four digits of your card, and billing address for record-keeping purposes.
        </p>

        {/* 3. How We Use Information */}
        <h2 style={sectionHeadingStyle}>3. How We Use Information</h2>
        <p style={bodyStyle}>
          We use the information we collect for the following purposes:
        </p>
        <ul style={listStyle}>
          <li>
            <strong>Service Delivery:</strong> To provide, operate, and maintain the AyurGate
            platform and its features, including patient management, scheduling, billing, and
            all other core functionality.
          </li>
          <li>
            <strong>Account Management:</strong> To create and manage your account, verify your
            identity, and process subscription payments.
          </li>
          <li>
            <strong>Customer Support:</strong> To respond to your enquiries, troubleshoot
            issues, and provide technical assistance.
          </li>
          <li>
            <strong>Billing and Invoicing:</strong> To process payments, generate invoices, and
            manage subscription renewals.
          </li>
          <li>
            <strong>Analytics and Improvement:</strong> To analyse usage patterns (in aggregate)
            to improve the platform, develop new features, and enhance user experience.
          </li>
          <li>
            <strong>Communication:</strong> To send you important notifications about your
            account, service updates, security alerts, and changes to our terms or policies.
          </li>
          <li>
            <strong>Legal Compliance:</strong> To comply with applicable laws, regulations, and
            legal processes.
          </li>
        </ul>

        {/* 4. Data Storage & Security */}
        <h2 style={sectionHeadingStyle}>4. Data Storage and Security</h2>
        <p style={bodyStyle}>
          We implement robust technical and organisational measures to protect your data against
          unauthorised access, alteration, disclosure, or destruction:
        </p>
        <ul style={listStyle}>
          <li>
            <strong>Encryption:</strong> All data is encrypted at rest using AES-256 encryption
            and in transit using TLS 1.2 or higher.
          </li>
          <li>
            <strong>Secure Infrastructure:</strong> The Service is hosted on secure cloud
            infrastructure with enterprise-grade physical and network security controls.
          </li>
          <li>
            <strong>Regular Backups:</strong> We perform automated daily backups of all data to
            geographically separate locations to ensure data durability and disaster recovery
            capability.
          </li>
          <li>
            <strong>Access Controls:</strong> Access to production systems and customer data is
            restricted to authorised personnel on a need-to-know basis, protected by
            multi-factor authentication, and subject to audit logging.
          </li>
          <li>
            <strong>Security Monitoring:</strong> We employ continuous monitoring, intrusion
            detection systems, and regular security assessments to identify and address
            potential vulnerabilities.
          </li>
          <li>
            <strong>Incident Response:</strong> We maintain an incident response plan and will
            notify affected users promptly in the event of a data breach, in accordance with
            applicable laws.
          </li>
        </ul>

        {/* 5. Healthcare Data (PDPA Compliance) */}
        <h2 style={sectionHeadingStyle}>5. Healthcare Data and PDPA Compliance</h2>
        <p style={bodyStyle}>
          AyurGate processes healthcare data on behalf of clinics and practices. We recognise
          that patient health information requires the highest level of protection and care. Our
          handling of healthcare data is guided by the following principles:
        </p>
        <ul style={listStyle}>
          <li>
            <strong>Singapore PDPA Compliance:</strong> AyurGate is designed to comply with the
            Singapore Personal Data Protection Act (PDPA) and the guidelines issued by the
            Personal Data Protection Commission (PDPC). We support clinics in meeting their
            obligations as data controllers under the PDPA.
          </li>
          <li>
            <strong>Data Minimisation:</strong> We collect and process only the minimum amount
            of personal data necessary to provide the Service. We do not request or encourage
            the collection of unnecessary personal information.
          </li>
          <li>
            <strong>Purpose Limitation:</strong> Patient health data is processed solely for
            the purposes for which it was collected &mdash; namely, to enable the clinic to
            manage patient care, appointments, billing, and related administrative functions.
          </li>
          <li>
            <strong>Consent Management:</strong> The platform includes tools to help clinics
            manage patient consent for data collection and processing, in alignment with PDPA
            requirements.
          </li>
          <li>
            <strong>Data Protection Officer:</strong> Our Data Protection Officer can be
            reached at{" "}
            <a href="mailto:privacy@ayurgate.com" style={{ color: "#2d6a4f" }}>
              privacy@ayurgate.com
            </a>{" "}
            for any queries related to healthcare data handling.
          </li>
        </ul>
        <p style={bodyStyle}>
          For clinics operating in India, Malaysia, Sri Lanka, or the UAE, we also endeavour to
          comply with the applicable data protection regulations in those jurisdictions,
          including India&apos;s Digital Personal Data Protection Act (DPDPA), Malaysia&apos;s
          Personal Data Protection Act (PDPA), and the UAE&apos;s Federal Data Protection Law.
        </p>

        {/* 6. Data Sharing */}
        <h2 style={sectionHeadingStyle}>6. Data Sharing</h2>
        <p style={bodyStyle}>
          AyurGate does not sell, rent, trade, or otherwise disclose your personal data or
          patient data to third parties for marketing, advertising, or any other commercial
          purpose. We share data only with the following categories of service providers, and
          only to the extent necessary to operate the Service:
        </p>
        <ul style={listStyle}>
          <li>
            <strong>Stripe</strong> (payment processing) &mdash; receives payment details
            necessary to process subscription charges. Stripe is PCI DSS Level 1 certified.
          </li>
          <li>
            <strong>Resend</strong> (email delivery) &mdash; receives email addresses and
            message content necessary to deliver transactional emails such as appointment
            confirmations, password resets, and account notifications.
          </li>
          <li>
            <strong>Railway / Cloud Hosting</strong> (infrastructure) &mdash; hosts our
            application and databases. Data is stored on their secure infrastructure in
            accordance with their security policies.
          </li>
        </ul>
        <p style={bodyStyle}>
          All third-party service providers are bound by contractual obligations to protect your
          data and use it only for the purposes specified by AyurGate. We regularly review our
          service providers to ensure they maintain adequate security standards.
        </p>
        <p style={bodyStyle}>
          We may also disclose data if required to do so by law, court order, or government
          request, or if we believe in good faith that disclosure is necessary to protect the
          rights, property, or safety of AyurGate, our users, or the public.
        </p>

        {/* 7. Data Retention */}
        <h2 style={sectionHeadingStyle}>7. Data Retention</h2>
        <p style={bodyStyle}>
          We retain your data in accordance with the following policies:
        </p>
        <ul style={listStyle}>
          <li>
            <strong>Active Accounts:</strong> All data associated with your account is retained
            for as long as your subscription remains active. We do not delete or archive data
            from active accounts unless you specifically request it.
          </li>
          <li>
            <strong>After Cancellation or Termination:</strong> Following the cancellation or
            termination of your account, your data will remain accessible for export for 30
            days. During this period, you may download your data using the platform&apos;s
            built-in export tools or by contacting support.
          </li>
          <li>
            <strong>Permanent Deletion:</strong> After the 30-day grace period, all account
            data, including patient records, will be permanently deleted from our production
            systems.
          </li>
          <li>
            <strong>Backup Purge:</strong> Copies of your data that exist in our backup systems
            will be purged within 90 days of account termination.
          </li>
          <li>
            <strong>Legal Obligations:</strong> We may retain certain data for longer periods
            if required by applicable law or regulation (for example, financial records for tax
            or audit purposes).
          </li>
        </ul>

        {/* 8. Your Rights */}
        <h2 style={sectionHeadingStyle}>8. Your Rights</h2>
        <p style={bodyStyle}>
          Depending on your jurisdiction, you may have the following rights with respect to your
          personal data:
        </p>
        <ul style={listStyle}>
          <li>
            <strong>Right of Access:</strong> You may request a copy of the personal data we
            hold about you and information about how it is processed.
          </li>
          <li>
            <strong>Right to Correction:</strong> You may request that we correct any
            inaccurate or incomplete personal data we hold about you.
          </li>
          <li>
            <strong>Right to Deletion:</strong> You may request the deletion of your personal
            data, subject to any legal obligations that require us to retain it.
          </li>
          <li>
            <strong>Right to Data Portability:</strong> You may request your data in a
            structured, commonly used, machine-readable format (such as CSV or JSON) so that it
            can be transferred to another service.
          </li>
          <li>
            <strong>Right to Withdraw Consent:</strong> Where we rely on your consent to
            process personal data, you may withdraw that consent at any time. Withdrawal of
            consent does not affect the lawfulness of processing carried out prior to
            withdrawal.
          </li>
        </ul>
        <p style={bodyStyle}>
          To exercise any of these rights, please contact us at{" "}
          <a href="mailto:privacy@ayurgate.com" style={{ color: "#2d6a4f" }}>
            privacy@ayurgate.com
          </a>
          . We will respond to all legitimate requests within 30 days.
        </p>
        <p style={bodyStyle}>
          For patient data rights: patients should contact the clinic or practice that entered
          their data into AyurGate, as the clinic is the data controller. We will assist
          clinics in fulfilling data subject requests upon instruction.
        </p>

        {/* 9. Cookies */}
        <h2 style={sectionHeadingStyle}>9. Cookies</h2>
        <p style={bodyStyle}>
          AyurGate uses a minimal number of cookies that are strictly necessary for the
          operation of the Service:
        </p>
        <ul style={listStyle}>
          <li>
            <strong>Authentication Cookies:</strong> We use secure, HTTP-only cookies to manage
            your login session using JSON Web Tokens (JWT). These cookies are essential for
            keeping you securely logged in while you use the platform.
          </li>
          <li>
            <strong>Preference Cookies:</strong> We may store minimal preferences (such as
            language or timezone settings) to improve your experience.
          </li>
        </ul>
        <p style={bodyStyle}>
          We do not use:
        </p>
        <ul style={listStyle}>
          <li>Third-party tracking cookies</li>
          <li>Advertising or retargeting cookies</li>
          <li>Analytics cookies from third-party providers (such as Google Analytics)</li>
          <li>Social media tracking pixels or widgets</li>
        </ul>
        <p style={bodyStyle}>
          Because we only use strictly necessary cookies, no cookie consent banner is required
          under most jurisdictions. However, you can configure your browser to block or delete
          cookies at any time, though this may prevent you from using the platform.
        </p>

        {/* 10. Children's Privacy */}
        <h2 style={sectionHeadingStyle}>10. Children&apos;s Privacy</h2>
        <p style={bodyStyle}>
          AyurGate is a business-to-business service designed for use by licensed healthcare
          professionals and clinic administrators. The Service is not intended for use by
          individuals under the age of 18. We do not knowingly collect personal data from
          children.
        </p>
        <p style={bodyStyle}>
          If we become aware that we have inadvertently collected personal data from a person
          under 18 who is not a patient record entered by an authorised clinic user, we will
          take steps to delete that information promptly. If you believe that a child has
          provided us with personal data directly, please contact us at{" "}
          <a href="mailto:privacy@ayurgate.com" style={{ color: "#2d6a4f" }}>
            privacy@ayurgate.com
          </a>
          .
        </p>
        <p style={bodyStyle}>
          Note: Clinics may store records of minor patients within the platform as part of
          standard healthcare practice. Such records are managed by the clinic in accordance
          with applicable healthcare regulations and parental consent requirements.
        </p>

        {/* 11. International Data Transfers */}
        <h2 style={sectionHeadingStyle}>11. International Data Transfers</h2>
        <p style={bodyStyle}>
          AyurGate serves clinics in Singapore, India, Malaysia, Sri Lanka, and the UAE. Your
          data may be processed and stored in Singapore or in other regions where our cloud
          infrastructure providers operate data centres.
        </p>
        <ul style={listStyle}>
          <li>
            Where data is transferred across borders, we ensure that appropriate safeguards are
            in place, including contractual protections with our service providers that require
            them to protect data in accordance with applicable data protection laws.
          </li>
          <li>
            We endeavour to store data in the region closest to the clinic&apos;s primary
            location where feasible, and we will work with clinics that have specific data
            residency requirements.
          </li>
          <li>
            All cross-border data transfers are conducted in compliance with the Singapore PDPA
            and its requirements for the transfer of personal data outside of Singapore.
          </li>
        </ul>

        {/* 12. Changes to Policy */}
        <h2 style={sectionHeadingStyle}>12. Changes to This Policy</h2>
        <p style={bodyStyle}>
          We may update this Privacy Policy from time to time to reflect changes in our
          practices, technology, legal requirements, or other factors. When we make material
          changes to this policy, we will:
        </p>
        <ul style={listStyle}>
          <li>
            Provide at least 30 days&apos; advance notice via email to the address associated
            with your account.
          </li>
          <li>
            Post the updated Privacy Policy on the AyurGate website with a revised &quot;Last
            updated&quot; date.
          </li>
          <li>
            Display a prominent notice within the platform upon your next login following the
            update.
          </li>
        </ul>
        <p style={bodyStyle}>
          We encourage you to review this Privacy Policy periodically. Your continued use of the
          Service after the effective date of any changes constitutes your acceptance of the
          updated policy.
        </p>

        {/* 13. Contact */}
        <h2 style={sectionHeadingStyle}>13. Contact</h2>
        <p style={bodyStyle}>
          If you have any questions, concerns, or requests regarding this Privacy Policy or our
          data practices, please contact us:
        </p>
        <ul style={listStyle}>
          <li>
            <strong>Data Protection Officer:</strong>{" "}
            <a href="mailto:privacy@ayurgate.com" style={{ color: "#2d6a4f" }}>
              privacy@ayurgate.com
            </a>
          </li>
          <li>
            <strong>General Support:</strong>{" "}
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
        <p style={bodyStyle}>
          We aim to respond to all privacy-related enquiries within 30 days of receipt.
        </p>

        <div
          style={{
            marginTop: 48,
            paddingTop: 24,
            borderTop: "1px solid #e5e7eb",
            textAlign: "center",
          }}
        >
          <Link
            href="/terms"
            style={{ color: "#2d6a4f", textDecoration: "underline", fontSize: 14 }}
          >
            Terms of Use
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
