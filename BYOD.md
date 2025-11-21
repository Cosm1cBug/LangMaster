1️⃣ Prepare a folder with all Argos models

    - Get the official Argos Translate .argosmodel files from: https://www.argosopentech.com/argos-packages/
    - Place them in a folder models/ in your project root:

      project-root/
      ├─ models/
      │  ├─ en_es.argosmodel
      │  ├─ en_fr.argosmodel
      │  ├─ en_hi.argosmodel
      │  └─ ... other languages

2️⃣ Dockerfile to bake models

    - Create a Dockerfile in the project root:

```
      # Start from official LibreTranslate image
      FROM libretranslate/libretranslate:latest
      
      # Create Argos package directory inside container
      RUN mkdir -p /home/libretranslate/.local/share/argos-translate/packages
      
      # Copy pre-downloaded models into container
      COPY models/*.argosmodel /home/libretranslate/.local/share/argos-translate/packages/
      
      # Set ownership (LibreTranslate user runs container)
      RUN chown -R 1000:1000 /home/libretranslate/.local/share/argos-translate/packages
      
      # Environment variable to ensure Argos uses this path
      ENV ARGOS_PACKAGE_DIR=/home/libretranslate/.local/share/argos-translate/packages
      
      # Default command
      CMD ["./run.sh"]
```

3️⃣ Build the image
      - docker build -t libretranslate-preloaded:latest .

4️⃣ Run the container
      - docker run -d --name libretranslate-preloaded -p 5000:5000 libretranslate-preloaded:latest

5️⃣ Verify models are loaded

      - Call the /languages endpoint: curl http://localhost:5000/languages
      - It should show all the languages you baked in.
