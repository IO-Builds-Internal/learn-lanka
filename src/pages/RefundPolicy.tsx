import { ArrowLeft, RotateCcw, AlertCircle, Tag, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useNavigate } from 'react-router-dom';

const RefundPolicy = () => {
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
              <RotateCcw className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Refund Policy</h1>
              <p className="text-sm text-muted-foreground">Last updated: February 2026</p>
            </div>
          </div>
        </div>

        {/* Important Notice */}
        <Alert className="mb-6 border-destructive/50 bg-destructive/10">
          <AlertCircle className="h-4 w-4 text-destructive" />
          <AlertTitle className="text-destructive">Important Notice</AlertTitle>
          <AlertDescription className="text-destructive/80">
            We do not provide cash refunds under any circumstances. Eligible requests will receive store coupons only.
          </AlertDescription>
        </Alert>

        <Card className="card-elevated">
          <CardContent className="prose prose-sm dark:prose-invert max-w-none p-6 space-y-6">
            <section>
              <h2 className="text-lg font-semibold text-foreground mb-3">1. No Cash Refunds Policy</h2>
              <p className="text-muted-foreground">
                A/L Student Academy maintains a strict no cash refund policy. Once a payment is made and verified, we are unable to process cash refunds or reverse bank transfers. This policy applies to all services and products including:
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-4">
                <li>Monthly class fees</li>
                <li>Rank paper access fees</li>
                <li>Shop purchases (soft copies, printed materials)</li>
                <li>Any other paid services on the platform</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-foreground mb-3">2. Store Coupon Policy</h2>
              <div className="bg-success/10 border border-success/20 rounded-lg p-4 mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <Tag className="w-5 h-5 text-success" />
                  <span className="font-semibold text-success">Coupon-Based Compensation</span>
                </div>
                <p className="text-muted-foreground text-sm">
                  In eligible cases, instead of cash refunds, we issue store coupons that can be used for future purchases or services on our platform.
                </p>
              </div>
              <p className="text-muted-foreground">
                Store coupons may be issued in the following situations:
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-4">
                <li>Technical issues that prevented access to paid content for an extended period</li>
                <li>Duplicate payments made in error</li>
                <li>Class cancellation by A/L Student Academy (not student withdrawal)</li>
                <li>Defective printed materials that cannot be replaced</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-foreground mb-3">3. Coupon Terms and Conditions</h2>
              <p className="text-muted-foreground">Issued coupons are subject to the following terms:</p>
              <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-4">
                <li>Coupons are non-transferable and linked to your account</li>
                <li>Coupons have an expiry date (typically 6 months from issue)</li>
                <li>Coupons cannot be converted to cash under any circumstances</li>
                <li>If the coupon value exceeds the purchase amount, the remaining balance cannot be refunded</li>
                <li>Coupons can be used for any service or product on the platform</li>
                <li>Only one coupon can be used per transaction</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-foreground mb-3">4. Non-Refundable Situations</h2>
              <p className="text-muted-foreground">The following situations are NOT eligible for any form of compensation:</p>
              <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-4">
                <li>Change of mind after purchase</li>
                <li>Student withdrawal from a class</li>
                <li>Missed classes due to personal reasons</li>
                <li>Failure to access content due to user error or device issues</li>
                <li>Downloaded soft copies (PDFs cannot be returned)</li>
                <li>Partially used subscription periods</li>
                <li>Poor performance in assessments</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-foreground mb-3">5. Printed Materials</h2>
              <p className="text-muted-foreground">For printed materials purchased through our shop:</p>
              <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-4">
                <li><strong>Defective items:</strong> May be replaced or compensated with a coupon</li>
                <li><strong>Delivery issues:</strong> Contact us within 7 days of expected delivery</li>
                <li><strong>Wrong items:</strong> Will be replaced at no additional cost</li>
                <li><strong>Change of mind:</strong> Not eligible for return or exchange once dispatched</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-foreground mb-3">6. How to Request Compensation</h2>
              <p className="text-muted-foreground">If you believe you are eligible for a store coupon:</p>
              <ol className="list-decimal list-inside text-muted-foreground space-y-2 ml-4">
                <li>Contact us through the <a href="/contact" className="text-primary hover:underline">Contact Page</a></li>
                <li>Provide your registered phone number and payment details</li>
                <li>Clearly describe the issue with supporting evidence if applicable</li>
                <li>Our team will review your request within 3-5 business days</li>
                <li>If approved, a coupon code will be sent to your phone via SMS</li>
              </ol>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-foreground mb-3">7. Payment Verification Issues</h2>
              <p className="text-muted-foreground">
                If your payment was rejected during verification:
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-4">
                <li>You may resubmit a valid payment slip</li>
                <li>If the payment was made but rejected in error, contact us with bank proof</li>
                <li>Double payments will be compensated with equivalent store coupons</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-foreground mb-3">8. Final Decision</h2>
              <p className="text-muted-foreground">
                All compensation requests are reviewed on a case-by-case basis. The decision of A/L Student Academy management regarding compensation requests is final and binding. We reserve the right to deny compensation requests that do not meet our eligibility criteria.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-foreground mb-3">9. Contact Us</h2>
              <p className="text-muted-foreground">
                For any questions about this Refund Policy or to submit a compensation request, please contact us through our <a href="/contact" className="text-primary hover:underline">Contact Page</a>.
              </p>
            </section>
          </CardContent>
        </Card>

        {/* Summary Card */}
        <Card className="card-elevated mt-6 border-warning/20 bg-warning/5">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-foreground">Summary</p>
                <p className="text-sm text-muted-foreground mt-1">
                  No cash refunds are provided. Eligible issues are compensated with store coupons only. Coupons cannot be converted to cash and any excess coupon value over purchase amount is forfeited.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default RefundPolicy;
