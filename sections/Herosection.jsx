import { motion } from "framer-motion";

const HeroSection = () => {
  return (
    <section className="hero-section">
      <motion.h1
        initial={{ y: 100, opacity: 0 }}
        whileInView={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.8 }}
      >
        Welcome to My Portfolio
      </motion.h1>
      <motion.p
        initial={{ y: 100, opacity: 0 }}
        whileInView={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2, duration: 0.8 }}
      >
        Scroll down to explore more.
      </motion.p>
    </section>
  );
};

export default HeroSection;
