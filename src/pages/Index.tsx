import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { ArrowRight, Award, Target, BookOpen, Users, TrendingUp, Instagram, Facebook, CheckCircle } from "lucide-react";
import heroImage from "@/assets/hero-image.jpg";
import coachPLogo from "@/assets/coach-p-logo.png";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useState } from "react";

const Index = () => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Form submitted:", formData);
    // Handle form submission
  };

  return (
    <div className="min-h-screen">
      {/* Navigation */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur shadow-soft">
        <div className="container mx-auto px-4 py-4">
          <nav className="flex items-center justify-between">
            <Link to="/" className="flex items-center gap-3">
              <img src={coachPLogo} alt="Coach P Portal" className="h-12 w-12" />
              <div className="flex flex-col leading-none">
                <span className="text-xl font-serif font-bold text-primary tracking-[0.2em]">COACH P</span>
                <span className="text-sm font-serif font-semibold text-accent tracking-[0.15em]">CONSULTING</span>
              </div>
            </Link>
            <div className="hidden md:flex items-center gap-6">
              <a href="#about" className="text-foreground hover:text-accent transition-colors">About</a>
              <a href="#qualifications" className="text-foreground hover:text-accent transition-colors">Qualifications</a>
              <a href="#contact" className="text-foreground hover:text-accent transition-colors">Contact</a>
              <Link to="/auth">
                <Button variant="outline">Log In</Button>
              </Link>
            </div>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-primary py-24 md:py-32">
        <div className="absolute inset-0">
          <img
            src={heroImage}
            alt="Professional training environment"
            className="w-full h-full object-cover opacity-10"
          />
        </div>
        
        <div className="relative container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <div className="flex justify-center mb-8">
              <img src={coachPLogo} alt="Coach P Portal" className="h-32 w-32 drop-shadow-lg" />
            </div>
            <p className="text-accent font-serif text-xl md:text-2xl mb-4 tracking-wide uppercase">
              Ambition is the First Step Towards
            </p>
            <h1 className="text-6xl md:text-8xl font-serif font-bold mb-6 leading-tight text-white">
              SUCCESS
            </h1>
            <p className="text-2xl md:text-3xl text-white mb-12 font-serif">
              IT'S TIME TO LEVEL UP YOUR AGENCY
            </p>
            <Link to="/auth">
              <Button size="lg" className="bg-accent hover:bg-accent/90 text-white shadow-gold text-lg px-8 py-6">
                Level Up with Coach P
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="py-20 bg-background">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-4xl md:text-5xl font-serif font-bold text-primary mb-4">
                Meet your Coach
              </h2>
              <div className="w-24 h-1 bg-accent mx-auto mb-8"></div>
            </div>
            
            <div className="space-y-6 text-lg leading-relaxed text-foreground">
              <p>
                As a father of four, and an owner of multiple businesses, I am a big fan of systems and processes. 
                I believe we should have a plan for every scenario and constantly drive results through our team.
              </p>
              
              <p>
                After years of trial and error, I have realized the significance of team development. Due to this, 
                I have created a program to drive consistent, high-level coaching to agencies across the country.
              </p>
              
              <p>
                I am passionate about keeping our brand strong and doing things the right way. I want every agent 
                and team member across the country to be confident and proud to represent the best and I want to 
                help get them there.
              </p>
              
              <div className="border-l-4 border-accent pl-6 my-8 bg-secondary/30 py-6 rounded-r">
                <h3 className="text-2xl font-serif font-bold text-primary mb-4">
                  Passionate About Inspiring Others
                </h3>
                <p className="mb-4">
                  Growing up as a State Farm kid, I have watched my father run a successful agency for 40 years. 
                  Out of college I had to give it a try myself and I was an agent team member for nearly 3 years 
                  with a high-level agent. After a few years of success, it was time for me to go out on my own.
                </p>
                <p className="mb-4">
                  Once into agency, I quickly realized that it takes much more than hard work to grow a successful 
                  business. After the first few years of struggles, I got serious about investing into my team and 
                  developing myself into a better leader. With that came systems, processes, delegation, and 
                  specialization. We now have a large, stable team of professionals who are at the top of their 
                  game year after year.
                </p>
                <p>
                  My goal now is to share this knowledge with other agents and help them take care of their #1 
                  asset - their teams. My goal is to take the constant burden of training and accountability off 
                  of the agent's shoulders and put it on mine. With constant coaching each week, I am confident 
                  we can build successful people inside each agency and help you reach your goals.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Qualifications Section */}
      <section id="qualifications" className="py-20 bg-secondary/30">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <Award className="h-16 w-16 mx-auto mb-4 text-accent" />
              <h2 className="text-4xl md:text-5xl font-serif font-bold text-primary mb-4">
                Qualifications
              </h2>
              <div className="w-24 h-1 bg-accent mx-auto"></div>
            </div>
            
            <div className="grid md:grid-cols-2 gap-4">
              {[
                "Multi-line President's Club",
                "Chairman's Circle (Legacy & MOA)",
                "Exotic Travel Qualifier",
                "Million Dollar Round Table",
                "Built a team of 40 with no business debt",
                "700+ Life apps written in 2022 and 800 in 2021",
                "One of the first 3 office agents in the company",
                "Top ranked Quicken Mortgage Agent",
              ].map((qual, index) => (
                <div key={index} className="flex items-start gap-3 bg-background p-4 rounded-lg shadow-soft">
                  <CheckCircle className="h-6 w-6 text-accent flex-shrink-0 mt-0.5" />
                  <span className="text-foreground font-medium">{qual}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Testimonial Section */}
      <section className="py-20 bg-primary">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <div className="text-accent text-6xl mb-4">"</div>
            <p className="text-xl md:text-2xl text-white mb-6 leading-relaxed">
              FYI- it is nearly impossible to have me sit through 1:30 min recorded/zoom/anything without 
              being distracted/bored. You have accomplished this. I am looking forward to the future calls.
            </p>
            <p className="text-accent font-serif text-lg tracking-wide">
              - Brent Holtz
            </p>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="py-20 bg-background">
        <div className="container mx-auto px-4">
          <div className="max-w-2xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-4xl md:text-5xl font-serif font-bold text-primary mb-4">
                Ready to Level Up Your Business?
              </h2>
              <p className="text-xl text-muted-foreground">
                Contact us to be enrolled in our weekly training calls.
              </p>
            </div>
            
            <Card className="shadow-medium">
              <CardContent className="p-8">
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="name">Name</Label>
                    <Input
                      id="name"
                      placeholder="Enter Your Name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="Enter Your Email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="subject">Subject</Label>
                    <Input
                      id="subject"
                      placeholder="Enter Your Subject"
                      value={formData.subject}
                      onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="message">Message</Label>
                    <Textarea
                      id="message"
                      placeholder="Message"
                      rows={6}
                      value={formData.message}
                      onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                      required
                    />
                  </div>
                  
                  <Button type="submit" size="lg" className="w-full bg-accent hover:bg-accent/90">
                    Submit
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Social Media CTA */}
      <section className="py-16 bg-gradient-gold">
        <div className="container mx-auto px-4 text-center">
          <h3 className="text-3xl font-serif font-bold text-white mb-6">
            Unlock Your Potential with Coach P Portal
          </h3>
          <p className="text-xl text-white/90 mb-8">Get Inspired on Social Media</p>
          <div className="flex justify-center gap-4">
            <a
              href="https://instagram.com"
              target="_blank"
              rel="noopener noreferrer"
              className="bg-white p-4 rounded-full hover:bg-white/90 transition-colors"
            >
              <Instagram className="h-8 w-8 text-accent" />
            </a>
            <a
              href="https://facebook.com"
              target="_blank"
              rel="noopener noreferrer"
              className="bg-white p-4 rounded-full hover:bg-white/90 transition-colors"
            >
              <Facebook className="h-8 w-8 text-accent" />
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8 bg-primary">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto space-y-4">
            <p className="text-xs text-white/70 text-center leading-relaxed">
              Disclaimer: State Farm has not reviewed or approved this material and neither supports or 
              endorses the material presented. Additionally, State Farm makes no warranty regarding the 
              accuracy or usability of the information contained in the presentation.
            </p>
            <p className="text-sm text-white/90 text-center font-serif">
              © 2025 David Peterson - Coach P Portal. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
