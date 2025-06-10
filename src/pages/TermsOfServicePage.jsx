import { Link } from "react-router-dom";
import { Button } from "../components/ui/Button";

const TermsOfServicePage = () => {
  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white shadow-sm rounded-lg">
          <div className="px-6 py-8 sm:px-8 sm:py-12">
            {/* 
              TERMLY HTML CONTENT - ACTUAL TERMS OF SERVICE
            */}
            <div
              className="termly-content prose prose-lg max-w-none"
              dangerouslySetInnerHTML={{
                __html: `
                  <h1>Terms of Service</h1>
                  
                  <p><strong>DATE OF LAST REVISION: 10/6/2025</strong></p>
                  
                  <p><strong>IMPORTANT, PLEASE READ THESE ONLINE TERMS OF USE CAREFULLY.</strong></p>
                  
                  <p>Welcome to pkmnbindr.com. pkmnbindr (hereafter referred to as "pkmnbindr", "we", "us", or "our") provides a platform for online courses (collectively, the "Services"), which Services are accessible at pkmnbindr.com and any other websites through which pkmnbindr makes the Services available (collectively, the "Site").</p>
                  
                  <p>The Site and Services are offered to you conditioned on your acceptance without modification of the terms, conditions, and notices contained herein (the "Terms"). Your use of the Site and Services constitutes your agreement to all such Terms. Please read these terms carefully, and keep a copy of them for your reference. We reserve the right to update or modify these Terms at any time without prior notice to you, and your continued use of the Site following pkmnbindr's posting of any changes will constitute your acceptance of such changes or modifications. We encourage you to review these Terms whenever you use the Site.</p>
                  
                  <h2>Privacy</h2>
                  <p>Your use of the Site and Services are subject to pkmnbindr's Privacy Policy. Please review our Privacy Policy, which also governs the Site and informs users of our data collection practices. pkmnbindr does not knowingly collect, either online or offline, personal information from persons under the age of 13.</p>
                  
                  <h2>Eligibility</h2>
                  <p>The Site and Services are intended solely for persons who are 18 or older. Any access to or use of the Site or Services by anyone under 18 is expressly prohibited. By accessing or using the Site or Services you represent and warrant that you are 18 or older. As a condition of your use of the Service, you agree to (a) provide pkmnbindr with true, accurate, current and complete information as prompted by the pkmnbindr registration forms, when registering for or using the Service and (b) update and maintain the truthfulness, accuracy and completeness of such information.</p>
                  
                  <h2>Your Account</h2>
                  <p>If you use the Site or Services, you are responsible for maintaining the confidentiality of your account and password and for restricting access to your computer, and you agree to accept responsibility for all activities that occur under your account or password. You may not assign or otherwise transfer your account to any other person or entity. You acknowledge that pkmnbindr is not responsible for third-party access to your account that results from theft or misappropriation of your account. pkmnbindr and its associates reserve the right to refuse or cancel service, terminate accounts, or remove or edit content in our sole discretion.</p>
                  
                  <h2>Links to Third Party Sites/Third Party Services</h2>
                  <p>The Site and Services contain links to other websites ("Linked Sites"). The Linked Sites are not under the control of pkmnbindr and pkmnbindr assumes no responsibility for, the content, privacy policies, or practices of any third-party websites, and you access and use these websites solely at your own risk. pkmnbindr is providing these links to you only as a convenience, and the inclusion of any link does not imply endorsement by pkmnbindr of the site or any association with its operators. By using the Site or Services, you expressly relieve pkmnbindr from any and all liability arising from your use of any third-party website and from any loss or damage of any sort you may incur from dealing with any third party. It is up to you to take appropriate precautions to ensure that any website you visit is free of destructive items such as worms or viruses. We encourage you to be aware when you leave the Site and to read the terms and conditions of use for each other website that you visit.</p>
                  
                  <p>Certain services made available via the Site or Services are delivered by third-party sites and organizations. By using any product, service or functionality originating from the Site, you hereby acknowledge and consent that pkmnbindr may share such information and data with any third party with whom pkmnbindr has a contractual relationship to provide the requested product, service or functionality on behalf of users and customers of the Site or Services.</p>
                  
                  <h2>No Unlawful or Prohibited Use/Intellectual Property</h2>
                  <p>You are granted a non-exclusive, non-transferable, revocable license to access and use the Site and Services strictly in accordance with these terms of use. As a condition of your use of the Site, you warrant to pkmnbindr that you will not use the Site for any purpose that is unlawful or prohibited by these Terms.</p>
                  
                  <p>All content included as part of the Site and Services, such as text, graphics, logos, images, as well as the compilation thereof, and any software used on the Site or in the Application, is the property of pkmnbindr, its suppliers or third-parties and protected by trademark, copyright and other laws that protect intellectual property and proprietary rights. You agree to observe and abide by all trademark, copyright and other proprietary notices, legends or other restrictions contained in any such content and will not make any changes thereto, including without limitation altering any proprietary rights or attribution notices in any such content. Access to the Site and Services does not authorize anyone to use any of pkmnbindr's names, logos or marks, including without limitation the pkmnbindr trademark or logo, or any other intellectual property in any manner. The content on the Site may be used only as an information resource, and pkmnbindr content is not for resale. You will use protected content solely for your personal, non-commercial use, and will make no other use of the content without the express written permission of pkmnbindr and the copyright owner. You agree that you do not acquire any ownership rights in any protected content. We do not grant you any licenses, express or implied, to the intellectual property of pkmnbindr or our licensors except as expressly authorized by these Terms. Any other use, including the reproduction, modification, distribution, transmission, republication, display, or performance, of the content on the Site is strictly prohibited.</p>
                  
                  <p>Further, in your use of the Site and Services, you may not:</p>
                  <ul>
                    <li>modify, publish, transmit, reverse engineer, participate in the transfer or sale, create derivative works, or in any way exploit any of the content, in whole or in part, found on the Site or the Application;</li>
                    <li>use web crawlers, web robots, web scutters, ants, automatic indexers, bots, worms, and other such devices in connection with the Site; provided, however, that general purpose Internet search engines and non-commercial public archives that use tools to gather information for the sole purpose of displaying hyperlinks to the Site are granted a limited exception from the foregoing exclusion, provided that they do so from a stable IP address or range of IP addresses using an easily-identifiable agent;</li>
                    <li>use the Site in any manner that could damage, disable, overburden, or impair the Site or interfere with any other party's use of the Site;</li>
                    <li>obtain or attempt to obtain any content through any means not intentionally made available or provided for through the Site;</li>
                    <li>remove, modify, disable, block, obscure or otherwise impair any advertising in connection with the Site;</li>
                    <li>collect personally identifiable information of other users or visitors;</li>
                    <li>harvest information about users for the purpose of sending, or to facilitate or encourage the sending of, unsolicited bulk or other communications; or</li>
                    <li>post or transmit any worms, viruses, Trojans, or other harmful, disruptive, or destructive files, code, or programs to the Site.</li>
                  </ul>
                  
                  <p>pkmnbindr will fully cooperate with any law enforcement authorities or court order requesting or directing pkmnbindr to disclose the identity of anyone violating these Terms.</p>
                  
                  <p>In its sole discretion, in addition to any other rights or remedies available to and without any liability whatsoever, pkmnbindr may at any time and without notice may terminate or restrict your access to any component of the Site.</p>
                  
                  <h2>Electronic Communications/Notice</h2>
                  <p>Visiting or using the Site or Services or sending emails to pkmnbindr constitutes electronic communications. You consent to receiving electronic communications, and you agree that all agreements, notices, disclosures and other communications that we provide to you electronically, via email or by posting the notices on the Site satisfy any legal requirement that such communications be in writing. All notices to pkmnbindr will be provided by sending an email to buodd14@gmail.com. Such notices will be deemed delivered upon the earlier of the verification of delivery or two (2) business days after being sent.</p>
                  
                  <h2>Use of Communication Services</h2>
                  <p>The Site may contain bulletin board services, blogs, chat areas, news groups, forums, communities, personal web pages, calendars, and/or other message or communication facilities designed to enable you to communicate with the public at large or with a group (collectively, "Communication Services"), you agree to use the Communication Services only to post, send and receive messages and material that are proper and related to the particular Communication Service.</p>
                  
                  <p>By way of example, and not as a limitation, you agree that when using a Communication Service, you will not:</p>
                  <ul>
                    <li>defame, abuse, harass, stalk, threaten or otherwise violate the legal rights (such as rights of privacy and publicity) of others;</li>
                    <li>publish, post, upload, distribute or disseminate any inappropriate, profane, defamatory, infringing, obscene, indecent or unlawful topic, name, material or information;</li>
                    <li>upload files that contain software or other material protected by intellectual property laws (or by rights of privacy of publicity) unless you own or control the rights thereto or have received all necessary consents;</li>
                    <li>upload files that contain viruses, corrupted files, or any other similar software or programs that may damage the operation of another's computer;</li>
                    <li>advertise or offer to sell or buy any goods or services for any business purpose, unless such Communication Service specifically allows such messages;</li>
                    <li>conduct or forward surveys, contests, pyramid schemes or chain letters;</li>
                    <li>download any file posted by another user of a Communication Service that you know, or reasonably should know, cannot be legally distributed in such manner;</li>
                    <li>falsify or delete any author attributions, legal or other proper notices or proprietary designations or labels of the origin or source of software or other material contained in a file that is uploaded, restrict or inhibit any other user from using and enjoying the Communication Services;</li>
                    <li>violate any code of conduct or other guidelines which may be applicable for any particular Communication Service;</li>
                    <li>harvest or otherwise collect information about others, including e-mail addresses, without their consent; or</li>
                    <li>violate any applicable laws or regulations.</li>
                  </ul>
                  
                  <p>pkmnbindr has no obligation to monitor the Communication Services. However, pkmnbindr reserves the right to review materials posted to a Communication Service and to remove any materials in its sole discretion. pkmnbindr reserves the right to terminate your access to any or all of the Communication Services at any time without notice for any reason whatsoever.</p>
                  
                  <p>pkmnbindr reserves the right at all times to disclose any information as necessary to satisfy any applicable law, regulation, legal process or governmental request, or to edit, refuse to post or to remove any information or materials, in whole or in part, in pkmnbindr's sole discretion.</p>
                  
                  <p>Always use caution when giving out any personally identifying information about yourself or your children in any Communication Service. pkmnbindr does not control or endorse the content, messages or information found in any Communication Service and, therefore, pkmnbindr specifically disclaims any liability with regard to the Communication Services and any actions resulting from your participation in any Communication Service. Managers and hosts are not authorized pkmnbindr spokespersons, and their views do not necessarily reflect those of pkmnbindr.</p>
                  
                  <p>Materials uploaded to a Communication Service may be subject to posted limitations on usage, reproduction and/or dissemination. You are responsible for adhering to such limitations if you upload the materials.</p>
                  
                  <h2>Materials Provided to pkmnbindr or Posted on Any pkmnbindr Web Page</h2>
                  <p>pkmnbindr does not claim ownership of the materials you provide to pkmnbindr (including feedback and suggestions) or post, upload, input or submit to any pkmnbindr Site or our associated services (collectively "Submissions"). However, by posting, uploading, inputting, providing or submitting your Submissions you are granting pkmnbindr, our affiliated companies and necessary sublicensees an irrevocable, perpetual, non-exclusive, fully paid, worldwide license to use your Submissions in connection with the operation of the Site or Services or our affiliated companies' Internet businesses including, without limitation, the rights to: copy, distribute, transmit, publicly display, publicly perform, reproduce, edit, translate and reformat your Submissions; and to publish or refrain from publishing your name in connection with your Submissions.</p>
                  
                  <p>No compensation will be paid with respect to the use of your Submissions, as provided herein. pkmnbindr is under no obligation to post or use any Submissions you may provide and may remove any Submissions at any time in pkmnbindr's sole discretion.</p>
                  
                  <p>By posting, uploading, inputting, providing or submitting your Submissions, you warrant and represent that you own or otherwise control all of the rights to your Submissions as described in this Section including, without limitation, all the rights necessary for you to provide, post, upload, input or submit the Submissions and the rights granted to pkmnbindr herein.</p>
                  
                  <h2>No Endorsement</h2>
                  <p>pkmnbindr does not endorse any of the courses about which information is provided via the Site or Services. You are responsible for determining the identity and suitability of others whom you contact via the Site or Services. We will not be responsible for any damage or harm resulting from your interactions with any online course providers. Your dealings with online course providers and any other terms, conditions, representations or warranties associated with such dealings, are between you and such online course providers exclusively and do not involve pkmnbindr. You should make whatever investigation or other resources that you deem necessary or appropriate before signing up for any online courses.</p>
                  
                  <p>By using the Site or Services, you agree that any legal remedy or liability that you seek to obtain for actions or omissions of any online course providers or other third parties will be limited to a claim against the particular online course providers or other third parties who caused you harm, and you agree not to attempt to impose liability on, or seek any legal remedy from pkmnbindr with respect to such actions or omissions and hereby release pkmnbindr from any and all liability for or relating to any interactions or dealings with online course providers.</p>
                  
                  <h2>International Users</h2>
                  <p>The Site and Services are controlled, operated and administered by pkmnbindr from our offices within the Norway If you access the Site or Services from a location outside the Norway, you are responsible for compliance with all local laws. You agree that you will not use the pkmnbindr content accessed through the Site or Services in any country or in any manner prohibited by any applicable laws, restrictions or regulations.</p>
                  
                  <h2>Delays</h2>
                  <p>The Site or Services may be subject to limitations, delays and other problems inherent in the use of the Internet and electronic communications. pkmnbindr is not responsible for any delays, failures or other damage resulting from such problems.</p>
                  
                  <h2>Indemnification</h2>
                  <p>You agree to indemnify, defend and hold harmless pkmnbindr, its officers, directors, employees, agents and third parties, for any losses, costs, liabilities and expenses (including reasonable attorneys' fees) relating to or arising out of your use of or inability to use the Site or Services; any user postings made by you; your violation of these Terms; your violation of any rights of a third party; or your violation of any applicable laws, rules or regulations. pkmnbindr reserves the right, at its own cost and sole discretion, to assume the exclusive defense and control of any matter otherwise subject to indemnification by you, in which event you will fully cooperate with pkmnbindr in asserting any available defenses.</p>
                  
                  <h2>Warranty and Liability Disclaimer</h2>
                  <p>The information, software, products, and services included in or available through the Site or Services may include inaccuracies or typographical errors. Changes are periodically added to the information herein. pkmnbindr and/or its suppliers may make improvements and/or changes in the site at any time.</p>
                  
                  <p>pkmnbindr and/or its suppliers make no representations about the suitability, reliability, availability, timeliness, and accuracy of the information, software, products, services and related graphics contained on the site for any purpose. To the maximum extent permitted by applicable law, all such information, software, products, services and related graphics are provided "as is" without warranty or condition of any kind. pkmnbindr and/or its suppliers hereby disclaim all warranties and conditions with regard to this information, software, products, services and related graphics, including all implied warranties or conditions of merchantability, fitness for a particular purpose, title and non-infringement.</p>
                  
                  <p><strong>YOU EXPRESSLY UNDERSTAND AND AGREE THAT pkmnbindr WILL NOT BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, PUNITIVE, COMPENSATORY, CONSEQUENTIAL OR EXEMPLARY DAMAGES (EVEN IF pkmnbindr HAS BEEN ADVISED OF THE POSSIBILITY OF SUCH DAMAGES) (COLLECTIVELY, "DAMAGES"), RESULTING FROM: (A) THE USE OR INABILITY TO USE THE SERVICE; (B) THE COST OF ANY GOODS AND/OR SERVICES PURCHASED OR OBTAINED AS A RESULT OF THE USE OF THE SERVICE; (C) DISCLOSURE OF, UNAUTHORIZED ACCESS TO OR ALTERATION OF YOUR INFORMATION OR CONTENT; (D) CONTENT YOU SUBMIT, RECEIVE, ACCESS, TRANSMIT OR OTHERWISE CONVEY THROUGH THE SERVICE; (E) STATEMENTS OR CONDUCT OF ANY ONLINE COURSE PROVIDERS OR OTHER THIRD PARTY THROUGH THE SERVICE; (F) ANY OTHER MATTER RELATING TO THE SERVICE; (G) ANY BREACH OF THIS AGREEMENT BY pkmnbindr OR THE FAILURE OF pkmnbindr TO PROVIDE THE SERVICE UNDER THIS AGREEMENT OR (H) ANY OTHER DEALINGS OR INTERACTIONS YOU HAVE WITH ANY ONLINE COURSE PROVIDERS (OR ANY OF THEIR REPRESENTATIVES OR AGENTS). THESE LIMITATIONS SHALL APPLY TO THE FULLEST EXTENT PERMITTED BY LAW.</strong> In some jurisdictions, limitations of liability are not permitted. In such jurisdictions, some of the foregoing limitations may not apply to You.</p>
                  
                  <h2>Termination/Access Restriction</h2>
                  <p>pkmnbindr reserves the right, in its sole discretion, to terminate your access to the Site and Services and the related services or any portion thereof at any time, without notice.</p>
                  
                  <h2>Governing Law/Dispute Resolution</h2>
                  <p>To the maximum extent permitted by law, this agreement is governed by the laws of the State of Washington and you hereby consent to the exclusive jurisdiction and venue of courts in Washington in all disputes arising out of or relating to the use of the Site. Use of the Site and Services is unauthorized in any jurisdiction that does not give effect to all provisions of these Terms, including, without limitation, this Section. pkmnbindr's performance of this agreement is subject to existing laws and legal process, and nothing contained in this agreement is in derogation of pkmnbindr's right to comply with governmental, court and law enforcement requests or requirements relating to your use of the Site or Services or information provided to or gathered by pkmnbindr with respect to such use.</p>
                  
                  <p>Except for claims for injunctive or equitable relief or claims regarding intellectual property rights (which may be brought in any competent court without the posting of a bond), any dispute arising under these Terms shall be finally settled in accordance with the Comprehensive Arbitration Rules of the Judicial Arbitration and Mediation Service, Inc. ("JAMS") by a single arbitrator appointed in accordance with such Rules. The arbitration shall take place in King County, Washington, in the English language and the arbitral decision may be enforced in any court in any jurisdiction. The prevailing party in any action or proceeding to enforce these Terms shall be entitled to costs and attorneys' fees.</p>
                  
                  <h2>No Joint Venture</h2>
                  <p>You agree that no joint venture, partnership, employment, or agency relationship exists between you and pkmnbindr as a result of this agreement or use of the Site or Services.</p>
                  
                  <h2>Entire Agreement</h2>
                  <p>Unless otherwise specified herein, this agreement constitutes the entire agreement between you and pkmnbindr with respect to the Site or Services and it supersedes all prior or contemporaneous communications and proposals, whether electronic, oral or written, between the user and pkmnbindr with respect to the Site. A printed version of this agreement and of any notice given in electronic form shall be admissible in judicial or administrative proceedings based upon or relating to this agreement to the same extent and subject to the same conditions as other business documents and records originally generated and maintained in printed form. It is the express wish to the parties that this agreement and all related documents be written in English.</p>
                  
                  <p>If any part of this agreement is determined to be invalid or unenforceable pursuant to applicable law including, but not limited to, the warranty disclaimers and liability limitations set forth above, then the invalid or unenforceable provision will be deemed superseded by a valid, enforceable provision that most closely matches the intent of the original provision and the remainder of the agreement shall continue in effect. These Terms will be binding upon and will inure to the benefit of the parties, their successors and permitted assigns.</p>
                  
                  <h2>Changes to Terms</h2>
                  <p>pkmnbindr reserves the right, in its sole discretion, to change the Terms under which the Site and Services are offered, and such modification(s) will be effective immediately upon being posted on our Site (pkmnbindr.com). The most current version of the Terms will supersede all previous versions. pkmnbindr encourages you to periodically review the Terms to stay informed of our updates. Your continued use of the Site or Services after such modifications will be deemed to be your conclusive acceptance of all modifications to this Agreement. If you are dissatisfied as a result of such modification(s), your only recourse is to immediately discontinue use of the Site or Services.</p>
                  
                  <h2>Contact Us</h2>
                  <p>pkmnbindr welcomes your questions or comments regarding the Terms by emailing us at buodd14@gmail.com.</p>
                  
                  <p><strong>IF YOU DO NOT AGREE TO ALL OF THE TERMS AND CONDITIONS OF THIS AGREEMENT, YOU MUST NOT USE THE SERVICE. BY USING THE SERVICE, YOU ACKNOWLEDGE THAT YOU HAVE READ AND UNDERSTOOD THE TERMS AND CONDITIONS OF THIS AGREEMENT AND YOU AGREE TO BE BOUND BY THESE TERMS AND CONDITIONS.</strong></p>
                `,
              }}
            />
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

export default TermsOfServicePage;
