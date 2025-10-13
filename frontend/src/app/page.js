'use client'
import Link from 'next/link'
import { FaRegFileAlt } from 'react-icons/fa'
import "./app.css"
import React, { useEffect, useState } from "react";

const AnimatedSection = ({ children, className = "", delay = 0 }) => {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => {
            setIsVisible(true);
        }, delay);

        return () => clearTimeout(timer);
    }, [delay]);

    return (
        <div className={`animated-section ${isVisible ? 'visible' : ''} ${className}`}>
            {children}
        </div>
    );
};

const ScrollRevealSection = ({ children, className = "" }) => {
    const [isVisible, setIsVisible] = useState(false);
    const [elementRef, setElementRef] = useState(null);

    useEffect(() => {
        if (!elementRef) return;

        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setIsVisible(true);
                }
            },
            {
                threshold: 0.1,
                rootMargin: '50px 0px'
            }
        );

        observer.observe(elementRef);

        return () => {
            if (elementRef) {
                observer.unobserve(elementRef);
            }
            observer.disconnect();
        };
    }, [elementRef]);

    return (
        <div
            ref={setElementRef}
            className={`scroll-reveal ${isVisible ? 'visible' : ''} ${className}`}
        >
            {children}
        </div>
    );
};

const FeatureCard = ({ icon, title, description, features, image, delay = 0 }) => (
    <ScrollRevealSection className="feature-card group">
        <div className="feature-card-inner">
            <div className="feature-image-container">
                <img src={image} alt={title} className="feature-image" />
                <div className="feature-overlay"></div>
            </div>
            <div className="feature-content">
                <div className="feature-icon">{icon}</div>
                <h3 className="feature-title">{title}</h3>
                <p className="feature-description">{description}</p>
                <ul className="feature-list">
                    {features.map((feature, index) => (
                        <li key={index} className="feature-item">
                            <span className="feature-bullet"></span>
                            {feature}
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    </ScrollRevealSection>
);

const BenefitItem = ({ title, description, delay = 0 }) => {
    const [isVisible, setIsVisible] = useState(false);
    const [elementRef, setElementRef] = useState(null);

    useEffect(() => {
        if (!elementRef) return;

        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setTimeout(() => {
                        setIsVisible(true);
                    }, delay);
                }
            },
            {
                threshold: 0.1,
                rootMargin: '50px 0px'
            }
        );

        observer.observe(elementRef);

        return () => {
            if (elementRef) {
                observer.unobserve(elementRef);
            }
            observer.disconnect();
        };
    }, [elementRef, delay]);

    return (
        <div
            ref={setElementRef}
            className={`benefit-item scroll-reveal ${isVisible ? 'visible' : ''}`}
        >
            <h3 className="benefit-title">{title}</h3>
            <p className="benefit-description">{description}</p>
        </div>
    );
};

const Home = () => {
    const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

    useEffect(() => {
        const handleMouseMove = (e) => {
            setMousePosition({ x: e.clientX, y: e.clientY });
        };

        window.addEventListener('mousemove', handleMouseMove);
        return () => window.removeEventListener('mousemove', handleMouseMove);
    }, []);

    const handleGetStarted = () => {
        window.location.href = '/dashboard';
    };

    return (
        <div className="landing-page">
            {/* 1) Logo + Title at top */}
            <div className="absolute top-8 left-40">
                <Link
                    href="/dashboard"
                    className="flex items-center gap-2 hover:opacity-80 transition"
                >
                    <div className="bg-blue-600 text-white rounded-full p-2">
                        <FaRegFileAlt size={20} />
                    </div>
                    <span className="text-xl font-bold text-white">
                        Document Manager
                    </span>
                </Link>
            </div>
            {/* Background Elements */}
            <div className="background-gradient"></div>
            <div className="background-pattern"></div>
            <div
                className="mouse-light"
                style={{
                    left: mousePosition.x,
                    top: mousePosition.y,
                }}
            ></div>

            {/* Hero Section */}
            <section className="hero-section">
                <div className="hero-container">
                    <div className="hero-content">
                        <AnimatedSection delay={200}>
                            <h1 className="hero-title">
                                Manage Your{" "}
                                <span className="gradient-text">Documents Smarter</span>
                            </h1>
                        </AnimatedSection>

                        <AnimatedSection delay={400}>
                            <p className="hero-subtitle">
                                Upload, summarize, and search through your documents with the power
                                of AI. Transform how you organize and find information in your files.
                            </p>
                        </AnimatedSection>

                        <AnimatedSection delay={600}>
                            <div className="hero-buttons">
                                <button
                                    onClick={handleGetStarted}
                                    className="btn-primary"
                                >
                                    Get Started Free
                                    <svg className="btn-icon" viewBox="0 0 24 24" fill="none">
                                        <path d="M5 12h14M12 5l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                </button>
                                <button className="btn-secondary" onClick={() =>
                                    window.open('https://github.com/DarylLim-18/FIT4002-Text-Summarization', '_blank', 'noopener')}>

                                    Github
                                    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="#000000" viewBox="0 0 256 256"><path d="M208.31,75.68A59.78,59.78,0,0,0,202.93,28,8,8,0,0,0,196,24a59.75,59.75,0,0,0-48,24H124A59.75,59.75,0,0,0,76,24a8,8,0,0,0-6.93,4,59.78,59.78,0,0,0-5.38,47.68A58.14,58.14,0,0,0,56,104v8a56.06,56.06,0,0,0,48.44,55.47A39.8,39.8,0,0,0,96,192v8H72a24,24,0,0,1-24-24A40,40,0,0,0,8,136a8,8,0,0,0,0,16,24,24,0,0,1,24,24,40,40,0,0,0,40,40H96v16a8,8,0,0,0,16,0V192a24,24,0,0,1,48,0v40a8,8,0,0,0,16,0V192a39.8,39.8,0,0,0-8.44-24.53A56.06,56.06,0,0,0,216,112v-8A58.14,58.14,0,0,0,208.31,75.68ZM200,112a40,40,0,0,1-40,40H112a40,40,0,0,1-40-40v-8a41.74,41.74,0,0,1,6.9-22.48A8,8,0,0,0,80,73.83a43.81,43.81,0,0,1,.79-33.58,43.88,43.88,0,0,1,32.32,20.06A8,8,0,0,0,119.82,64h32.35a8,8,0,0,0,6.74-3.69,43.87,43.87,0,0,1,32.32-20.06A43.81,43.81,0,0,1,192,73.83a8.09,8.09,0,0,0,1,7.65A41.72,41.72,0,0,1,200,104Z"></path></svg>
                                </button>
                            </div>
                        </AnimatedSection>
                    </div>

                    <div className="hero-visual">
                        <AnimatedSection delay={800}>
                            <div className="hero-image-container">
                                <img
                                    src="ChatGPT Image Jul 30, 2025, 11_09_53 AM.png"
                                    alt="Document Management Interface"
                                    className="hero-image"
                                />
                                <div className="hero-image-overlay"></div>
                            </div>
                        </AnimatedSection>
                    </div>
                </div>
            </section>

            {/* Features Section */}
            <section className="features-section">
                <div className="container">
                    <ScrollRevealSection>
                        <div className="section-header">
                            <h2 className="section-title">
                                Powerful Features for Modern Document Management
                            </h2>
                            <p className="section-subtitle">
                                Everything you need to organize, understand, and find your documents efficiently
                            </p>
                        </div>
                    </ScrollRevealSection>

                    <div className="features-grid">
                        <FeatureCard
                            icon={<svg viewBox="0 0 24 24" fill="none" className="w-8 h-8">
                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="currentColor" strokeWidth="2" />
                                <polyline points="14,2 14,8 20,8" stroke="currentColor" strokeWidth="2" />
                            </svg>}
                            title="Smart Upload"
                            description="Drag and drop PDF, DOCX, and TXT files with instant processing"
                            features={[
                                "Drag-and-drop interface",
                                "Multiple file format support",
                                "Instant file processing",
                                "Secure cloud storage"
                            ]}
                            image="SmartUpload.png"
                        />

                        <FeatureCard
                            icon={<svg viewBox="0 0 24 24" fill="none" className="w-8 h-8">
                                <path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                                <path d="M21 12c.552 0 1-.448 1-1s-.448-1-1-1-1 .448-1 1 .448 1 1 1z" stroke="currentColor" strokeWidth="2" />
                                <path d="M3 12c.552 0 1-.448 1-1s-.448-1-1-1-1 .448-1 1 .448 1 1 1z" stroke="currentColor" strokeWidth="2" />
                                <path d="M12 3c.552 0 1-.448 1-1s-.448-1-1-1-1 .448-1 1 .448 1 1 1z" stroke="currentColor" strokeWidth="2" />
                            </svg>}
                            title="AI-Powered Summaries"
                            description="Automatic document summarization using advanced AI technology"
                            features={[
                                "Instant 50-word summaries",
                                "Key point extraction",
                                "Smart content analysis",
                                "Time-saving automation"
                            ]}
                            image="https://images.pexels.com/photos/270366/pexels-photo-270366.jpeg"
                        />

                        <FeatureCard
                            icon={<svg viewBox="0 0 24 24" fill="none" className="w-8 h-8">
                                <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="2" />
                                <path d="m21 21-4.35-4.35" stroke="currentColor" strokeWidth="2" />
                            </svg>}
                            title="Semantic Search"
                            description="Find documents by content, not just filenames with powerful search"
                            features={[
                                "Full-text content search",
                                "Smart filtering options",
                                "Live search results",
                                "Advanced sorting capabilities"
                            ]}
                            image="https://images.unsplash.com/photo-1600267165477-6d4cc741b379"
                        />
                    </div>
                </div>
            </section>

            {/* Benefits Section */}
            <section className="benefits-section">
                <div className="container">
                    <ScrollRevealSection>
                        <div className="section-header">
                            <h2 className="section-title">Why Choose Our Document Manager?</h2>
                        </div>
                    </ScrollRevealSection>

                    <div className="benefits-grid">
                        <BenefitItem
                            title="Save Time with AI"
                            description="Never read through entire documents again. Get instant AI-generated summaries that capture the key points in under 50 words."
                            delay={100}
                        />

                        <BenefitItem
                            title="Find Anything Instantly"
                            description="Search through document content, not just filenames. Our semantic search understands context and finds exactly what you're looking for."
                            delay={200}
                        />

                        <BenefitItem
                            title="Universal Format Support"
                            description="Upload PDFs, Word documents, and text files seamlessly. All formats are processed and made searchable automatically."
                            delay={300}
                        />

                        <BenefitItem
                            title="Intuitive Interface"
                            description="Clean, modern design that makes document management feel effortless. Drag, drop, search, and organize with ease."
                            delay={400}
                        />
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="cta-section">
                <div className="container">
                    <ScrollRevealSection>
                        <div className="cta-content">
                            <h2 className="cta-title">
                                Ready to Transform Your Document Workflow?
                            </h2>
                            <p className="cta-subtitle">
                                Join thousands of users who have streamlined their document
                                management. Start organizing smarter today.
                            </p>
                            <button
                                onClick={handleGetStarted}
                                className="btn-primary btn-large"
                            >
                                Get Started Now
                                <svg className="btn-icon" viewBox="0 0 24 24" fill="none">
                                    <path d="M5 12h14M12 5l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                            </button>
                            <p className="cta-note">
                                No credit card required • Free to start • Secure & private
                            </p>
                        </div>
                    </ScrollRevealSection>
                </div>
            </section>

            {/* Footer */}
            <footer className="footer">
                <div className="container">
                    <div className="footer-content">
                        <div className="footer-brand">
                            <h3 className="footer-title">Document Manager</h3>
                            <p className="footer-description">
                                Smart document management powered by AI. Upload,
                                summarize, and search with ease.
                            </p>
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default Home