import { ArrowLeft, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useNavigate } from 'react-router-dom';

const Terms = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <FileText className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Terms and Conditions</h1>
              <p className="text-sm text-muted-foreground">Last updated: February 2026</p>
            </div>
          </div>
        </div>

        <Card className="card-elevated">
          <CardContent className="prose prose-sm dark:prose-invert max-w-none p-6 space-y-6">
            <section>
              <h2 className="text-lg font-semibold text-foreground mb-3">1. Acceptance of Terms</h2>
              <p className="text-muted-foreground">
                By accessing and using A/L Student Academy platform, you accept and agree to be bound by the terms and provision of this agreement. If you do not agree to abide by these terms, please do not use this service.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-foreground mb-3">2. Description of Service</h2>
              <p className="text-muted-foreground">
                ALICT provides online educational services including but not limited to:
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-4">
                <li>Online classes and lessons</li>
                <li>Past papers and educational materials</li>
                <li>Rank papers and assessments</li>
                <li>Printed and soft copy educational materials through our shop</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-foreground mb-3">3. User Registration</h2>
              <p className="text-muted-foreground">
                To access our services, users must register with a valid phone number. Users are responsible for maintaining the confidentiality of their account and password. Users agree to accept responsibility for all activities that occur under their account.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-foreground mb-3">4. Payment Terms</h2>
              <p className="text-muted-foreground">
                All payments are processed through bank transfer. Users must upload a valid payment slip for verification. Payment verification may take up to 24-48 hours during business days.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-foreground mb-3">5. Refund Policy</h2>
              <p className="text-muted-foreground">
                Please refer to our <a href="/refund-policy" className="text-primary hover:underline">Refund Policy</a> page for detailed information about refunds. In general, we do not provide cash refunds but may issue store coupons in specific circumstances.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-foreground mb-3">6. Intellectual Property</h2>
              <p className="text-muted-foreground">
                All content provided on this platform, including but not limited to text, graphics, logos, images, video, and audio, is the property of ALICT and is protected by copyright laws. Users are not permitted to reproduce, distribute, or modify any content without prior written consent.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-foreground mb-3">7. User Conduct</h2>
              <p className="text-muted-foreground">Users agree not to:</p>
              <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-4">
                <li>Share login credentials with others</li>
                <li>Copy or distribute educational materials without permission</li>
                <li>Engage in any form of cheating during assessments</li>
                <li>Use the service for any unlawful purpose</li>
                <li>Attempt to gain unauthorized access to any portion of the platform</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-foreground mb-3">8. Termination</h2>
              <p className="text-muted-foreground">
                We reserve the right to terminate or suspend access to our service immediately, without prior notice or liability, for any reason whatsoever, including without limitation if you breach the Terms.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-foreground mb-3">9. Changes to Terms</h2>
              <p className="text-muted-foreground">
                We reserve the right to modify or replace these Terms at any time. It is your responsibility to check the Terms periodically for changes. Your continued use of the platform following the posting of any changes constitutes acceptance of those changes.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-foreground mb-3">10. Contact Us</h2>
              <p className="text-muted-foreground">
                If you have any questions about these Terms, please contact us through our <a href="/contact" className="text-primary hover:underline">Contact Page</a>.
              </p>
            </section>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Terms;
