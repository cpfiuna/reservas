
import React from 'react';
import { motion } from 'framer-motion';

const Hero = () => {
  return (
    <section className="min-h-screen flex items-center justify-center pt-20">
      <div className="container-custom">
        <div className="max-w-3xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.19, 1, 0.22, 1] }}
          >
            <h1 className="text-4xl md:text-6xl font-light tracking-tight mb-6 leading-tight">
              Simplicity is the ultimate <br className="hidden md:block" />
              <span className="font-medium">sophistication</span>
            </h1>
            
            <p className="text-lg text-primary/70 mb-8 max-w-2xl mx-auto leading-relaxed">
              Design is not just what it looks like and feels like. Design is how it works.
              The details are not the details. They make the design.
            </p>
            
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4, duration: 0.6 }}
              className="flex flex-col sm:flex-row items-center justify-center gap-4"
            >
              <a 
                href="#learn-more" 
                className="px-8 py-3 bg-primary text-white rounded-full transition-all duration-300 hover:shadow-lg hover:translate-y-[-2px]"
              >
                Learn more
              </a>
              <a 
                href="#contact" 
                className="px-8 py-3 border border-primary/20 rounded-full hover:border-primary/50 transition-all duration-300"
              >
                Get in touch
              </a>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
