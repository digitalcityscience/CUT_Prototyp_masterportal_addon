<!--eslint-disable-->
<script>
    export default {};
</script>

<!--eslint-disable-->
<template>
    <div class="wrapped modal_content">
    <h3>Erklärung der Einstellungen</h3>

    <h4>Verkehrsgeschwindigkeit</h4>
    <p>Mit den beiden Schiebereglern für 30 km/h und 50 km/h kann der Benutzer die vorgesehene Verkehrsgeschwindigkeit in den jeweiligen Geschwindigkeitsbegrenzungsbereichen überschreiben und den Lärmpegel des Verkehrs durch höhere oder niedrigere Geschwindigkeitseinstellungen simulieren.</p>

    <h4>Verkehrsaufkommen</h4>
    <p>Verkehrsaufkommen von motorisierten Fahrzeugen (Autos, LKW). Eine Auswahl von 100% zeigt das Verkehrsaufkommen gemäß den aktuellen Planungsannahmen (prognostiziertes Verkehrsaufkommen). Eine Auswahl von 25% zeigt beispielsweise 25% des prognostizierten Verkehrsaufkommens.</p>

    <h4>Wie wird die Simulation berechnet?</h4>
    <p>Die Lärmsimulation basiert auf der Software NoiseModelling (<a href="https://noise-planet.org/noisemodelling.html">https://noise-planet.org/noisemodelling.html</a>), einem kostenlosen und Open-Source-Tool zur Erstellung von Umgebungslärmkarten mit einer vereinfachten Implementierung der französischen nationalen Methode NMPB-08. Die Berechnungsmethode entspricht weitgehend der CNOSSOS-EU-Standardmethode für Lärmemission (nur Straßenverkehr) und Lärmausbreitung. Die Software wird vom französischen Institut für Wissenschaft und Technologie für Verkehr, Entwicklung und Netze (Ifsttar) entwickelt.</p>

    <h4>Wie interpretiere ich mein Ergebnis?</h4>
    <p>Lärmindikatoren basieren auf der Richtlinie 2002/49/EG der Europäischen Union (3) in der Europäischen Region.</p>
    <ul>
        <li><p>LAeq, T ist der A-bewertete (eine Frequenzbewertung, die das menschliche Ohr besser widerspiegelt), äquivalente kontinuierliche Schalldruckpegel während eines angegebenen Zeitintervalls, beginnend bei t1 und endend bei t2, ausgedrückt in Dezibel (dB), an einem gegebenen Punkt im Raum. LAeq wird verwendet, um die Lärmbelastung durch Freizeitlärm auf menschlicher Ebene zu messen.</p></li>
    </ul>
    <p>Ein durchschnittlicher Lärmbelastungspegel von <53 dB Lden für Straßenverkehrslärm wird empfohlen.</p>
    <p>(basierend auf: WHO. (o.J.). Kapitel 11. Umgebungslärm - Weltgesundheitsorganisation. <a href="https://cdn.who.int/media/docs/default-source/who-compendium-on-health-and-environment/who_compendium_noise_01042022.pdf?sfvrsn=bc371498_3">https://cdn.who.int/media/docs/default-source/who-compendium-on-health-and-environment/who_compendium_noise_01042022.pdf?sfvrsn=bc371498_3</a>)</p>

    <h4>Farbschema</h4>
    <p>Die Zusammensetzung des Elf-Klassen-Schemas für die Präsentation der Lärmemission, z. B. die kombinierte Verwendung von Farben, die den vorgestellten Farben nach visueller Einschätzung oder aufgrund ihrer Farbcodes ähnlich sind, von Beate Tomio ist lizenziert unter einer Creative Commons Attribution – NonCommercial – NoDerivatives 4.0 International License. Mit Genehmigung verwendet. Erfahren Sie mehr: <a href="https://www.coloringnoise.com">https://www.coloringnoise.com</a></p>
    </div>
</template>


<style scoped lang="scss">
    @import "../utils/variables.scss";

    h3 {
        font-size:20px;
        border:none;
    }

    h4 {
        font-size:18px;
        padding-bottom:5px;
        margin-bottom: 20px;
        border-bottom:1px solid #ccc;
    }

    p {
        margin-bottom:20px;
    }
</style>
