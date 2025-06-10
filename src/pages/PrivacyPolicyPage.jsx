import { Link } from "react-router-dom";
import { Button } from "../components/ui/Button";

const PrivacyPolicyPage = () => {
  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white shadow-sm rounded-lg">
          <div className="px-6 py-8 sm:px-8 sm:py-12">
            {/* 
              PASTE YOUR TERMLY HTML CONTENT BELOW THIS COMMENT
              Remove this comment and paste your Termly HTML here
            */}
            <div className="privacy-policy-content">
              <style
                dangerouslySetInnerHTML={{
                  __html: `
                  .privacy-policy-content h1 {
                    font-size: 2.5rem;
                    font-weight: 700;
                    color: #1f2937;
                    margin-bottom: 1.5rem;
                    text-align: center;
                    border-bottom: 3px solid #3b82f6;
                    padding-bottom: 1rem;
                  }
                  .privacy-policy-content .last-updated {
                    text-align: center;
                    font-size: 1.1rem;
                    color: #6b7280;
                    margin-bottom: 3rem;
                    font-style: italic;
                  }
                  .privacy-policy-content .intro {
                    font-size: 1.2rem;
                    line-height: 1.8;
                    color: #374151;
                    margin-bottom: 3rem;
                    padding: 1.5rem;
                    background-color: #f8fafc;
                    border-left: 4px solid #3b82f6;
                    border-radius: 0.5rem;
                  }
                  .privacy-policy-content h2 {
                    font-size: 1.8rem;
                    font-weight: 600;
                    color: #1f2937;
                    margin-top: 3rem;
                    margin-bottom: 1.5rem;
                    padding-bottom: 0.5rem;
                    border-bottom: 2px solid #e5e7eb;
                  }
                  .privacy-policy-content p {
                    font-size: 1.1rem;
                    line-height: 1.7;
                    color: #374151;
                    margin-bottom: 1.5rem;
                  }
                  .privacy-policy-content ul {
                    margin-bottom: 2rem;
                    padding-left: 1.5rem;
                  }
                  .privacy-policy-content li {
                    font-size: 1.1rem;
                    line-height: 1.7;
                    color: #374151;
                    margin-bottom: 0.75rem;
                    list-style-type: disc;
                  }
                  .privacy-policy-content a {
                    color: #3b82f6;
                    text-decoration: underline;
                    font-weight: 500;
                  }
                  .privacy-policy-content a:hover {
                    color: #1d4ed8;
                  }
                  .privacy-policy-content .section {
                    margin-bottom: 2.5rem;
                  }
                `,
                }}
              />

              <div
                dangerouslySetInnerHTML={{
                  __html: `
                  <h1>Privacy Policy for pkmnbindr</h1>
                  <p class="last-updated"><strong>Last updated: June 10, 2025</strong></p>
                  
                  <div class="section">
                    <h2>1. Data Controller</h2>
                    <p>This service is operated as a hobby business in Norway. For privacy-related questions, contact us via <a href="https://www.pkmnbindr.com/contact" target="_blank" rel="noopener noreferrer">https://www.pkmnbindr.com/contact</a>.</p>
                    <p>This service is intended for users 18 years and older.</p>
                  </div>
                  
                  <div class="section">
                    <h2>2. Information We Collect</h2>
                    <p>When you create an account on pkmnbindr, we collect:</p>
                    <ul>
                      <li><strong>Email address</strong> - for login and account management</li>
                      <li><strong>Display name</strong> - what other users see</li>
                      <li><strong>Pokemon card data</strong> - your binder collections and card information</li>
                      <li><strong>Account activity</strong> - login times, last activity (for account management)</li>
                    </ul>
                    <p>We do <strong>not</strong> collect your real name, IP address, or use cookies or tracking technologies for analytics or marketing.</p>
                  </div>
                  
                  <div class="section">
                    <h2>3. Legal Basis for Processing (GDPR)</h2>
                    <p>We process your personal data based on:</p>
                    <ul>
                      <li><strong>Contract</strong> - to provide your account and subscription services</li>
                      <li><strong>Legitimate Interest</strong> - for security, fraud prevention, and service improvement</li>
                      <li><strong>Consent</strong> - for any optional features (which we'll ask for separately)</li>
                    </ul>
                  </div>
                  
                  <div class="section">
                    <h2>4. How We Use Your Information</h2>
                    <p>We use your data to:</p>
                    <ul>
                      <li>Create and manage your account</li>
                      <li>Provide access to subscription features</li>
                      <li>Store and display your Pokemon card collections</li>
                      <li>Ensure account security and prevent fraud</li>
                      <li>Provide customer support</li>
                    </ul>
                    <p>We do <strong>not</strong> use your data for marketing, advertising, or tracking. We do <strong>not</strong> share, sell, or transfer your personal information to third parties except as described below.</p>
                  </div>
                  
                  <div class="section">
                    <h2>5. Third-Party Services</h2>
                    <p>We use these trusted services:</p>
                    <ul>
                      <li><strong>Google Firebase</strong> - for hosting, database, and authentication (servers may be located internationally)</li>
                      <li><strong>Stripe</strong> - for secure payment processing (we never store your payment details)</li>
                      <li><strong>Google/Twitter</strong> - if you choose social login (only basic profile info)</li>
                    </ul>
                    <p>These services have their own privacy policies and may transfer data internationally with appropriate safeguards under GDPR.</p>
                  </div>
                  
                  <div class="section">
                    <h2>6. Data Retention</h2>
                    <p>We keep your data:</p>
                    <ul>
                      <li><strong>Account data</strong> - until you delete your account</li>
                      <li><strong>Payment records</strong> - for 7 years (legal requirement)</li>
                      <li><strong>Support communications</strong> - for 2 years</li>
                    </ul>
                    <p>You can request account deletion at any time.</p>
                  </div>
                  
                  <div class="section">
                    <h2>7. Your Rights Under GDPR</h2>
                    <p>As an EU resident, you have the right to:</p>
                    <ul>
                      <li><strong>Access</strong> - get a copy of your personal data</li>
                      <li><strong>Rectification</strong> - correct inaccurate data</li>
                      <li><strong>Erasure</strong> - delete your account and data</li>
                      <li><strong>Data Portability</strong> - export your data in a standard format</li>
                      <li><strong>Object</strong> - to processing based on legitimate interest</li>
                      <li><strong>Restrict Processing</strong> - limit how we use your data</li>
                      <li><strong>Withdraw Consent</strong> - for any consent-based processing</li>
                    </ul>
                    <p>To exercise these rights, contact us via <a href="https://www.pkmnbindr.com/contact" target="_blank" rel="noopener noreferrer">https://www.pkmnbindr.com/contact</a>. We'll respond within 30 days.</p>
                  </div>
                  
                  <div class="section">
                    <h2>8. Security</h2>
                    <p>We store all data securely on Google Firebase with industry-standard encryption. However, no system is 100% secure. Use a strong, unique password and keep it safe.</p>
                    <p>If we discover a data breach affecting your personal data, we'll notify you and the Norwegian Data Protection Authority as required by law.</p>
                  </div>
                  
                  <div class="section">
                    <h2>9. International Data Transfers</h2>
                    <p>Your data may be processed on servers outside the EU/EEA (primarily Google's infrastructure). These transfers are protected by:</p>
                    <ul>
                      <li>Google's compliance with GDPR</li>
                      <li>Standard Contractual Clauses approved by the EU Commission</li>
                      <li>Adequate security measures</li>
                    </ul>
                  </div>
                  
                  <div class="section">
                    <h2>10. Complaints</h2>
                    <p>If you're not satisfied with how we handle your personal data, you can file a complaint with:</p>
                    <p><strong>Datatilsynet (Norwegian Data Protection Authority)</strong><br>
                    Website: <a href="https://www.datatilsynet.no" target="_blank" rel="noopener noreferrer">www.datatilsynet.no</a></p>
                  </div>
                  
                  <div class="section">
                    <h2>11. Changes to This Policy</h2>
                    <p>We may update this privacy policy occasionally. If we make significant changes, we'll notify you by email or through the service. Continued use after changes means you accept the updated policy.</p>
                  </div>
                  
                  <div class="section">
                    <h2>12. Contact Us</h2>
                    <p>For any privacy-related questions or to exercise your rights, contact us via <a href="https://www.pkmnbindr.com/contact" target="_blank" rel="noopener noreferrer">https://www.pkmnbindr.com/contact</a>.</p>
                  </div>
                `,
                }}
              />
            </div>
            {/* END TERMLY CONTENT AREA */}

            {/* Footer Actions */}
            <div className="mt-12 pt-8 border-t border-gray-200">
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link to="/">
                  <Button variant="outline" className="w-full sm:w-auto">
                    Back to Home
                  </Button>
                </Link>
                <Link to="/auth/register">
                  <Button className="w-full sm:w-auto">
                    Continue Registration
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicyPage;
