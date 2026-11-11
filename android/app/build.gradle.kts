plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

android {
    namespace = "com.shadnox.app"
    compileSdk = 34

    defaultConfig {
        applicationId = "com.shadnox.app"
        minSdk = 26
        targetSdk = 34
        // Every GitHub build gets a higher versionCode so new APKs install over old ones.
        versionCode = (System.getenv("GITHUB_RUN_NUMBER") ?: "1").toInt()
        versionName = "1.0.0"
    }

    signingConfigs {
        create("shadnox") {
            storeFile = file("shadnox.keystore")
            storePassword = "shadnox123"
            keyAlias = "shadnox"
            keyPassword = "shadnox123"
        }
    }

    buildTypes {
        release {
            isMinifyEnabled = false
            signingConfig = signingConfigs.getByName("shadnox")
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    kotlinOptions { jvmTarget = "17" }

    lint {
        abortOnError = false
        checkReleaseBuilds = false
    }
}

dependencies {
    implementation("androidx.core:core-ktx:1.13.1")
    implementation("androidx.appcompat:appcompat:1.7.0")
}
