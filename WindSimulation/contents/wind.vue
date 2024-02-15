<!--eslint-disable-->
<script>
    export default {};
</script>

<!--eslint-disable-->
<template>
    <div class="wrapped modal_content">
    <h3>Erklärung der Einstellungen</h3>
    <p>
        Der Benutzer kann verschiedene Szenarien des Windkomforts über der Grundkarte bewerten, basierend auf zwei einstellbaren Parametern: der Richtung, aus der der Wind kommt, und der vorgeschlagenen Windgeschwindigkeit in km/h. Diese werden vom Benutzer in den einstellbaren Symbolleisten definiert.
    </p>

    <h4>Wie wird die Simulation berechnet?</h4>
    <p>
        SCHNELLE BERECHNUNGSZEITEN - ML UND CFD: Die Windkomfortberechnung ist eine Vorhersage einer numerischen Strömungssimulation (CFD) für die gegebene Windgeschwindigkeit und -richtung. Das InFraRed-Modell ist mit Hilfe von maschinellem Lernen auf 3D-CFD-Daten trainiert. Das "Training" eines Simulationsmodells ermöglicht die Durchführung nahezu in Echtzeit durchgeführter Simulationen mit webbasierten Anwendungen. Die Genauigkeit des Modells liegt zwischen 80 und 95%. Das InFraRed-Windkomfortmodell wurde vom City Intelligence Lab am Österreichischen Institut für Technologie und InFraRed entwickelt.
    </p>

    <h4>Wie interpretiere ich mein Ergebnis?</h4>
    <p>
        Windkomfort ist eine Kategorisierung der Windgeschwindigkeit auf Gehhöhe (1,75 Meter über dem Bodenniveau) gemäß den Aktivitäten, die bequem ausgeführt werden können. Die Windgeschwindigkeitsergebnisse werden gemäß den Lawson-Kriterien für Windkomfort in Kategorien gruppiert, um den Ausgabewert besser mit üblichen menschlichen Aktivitäten in Beziehung zu setzen. Niedrige Windgeschwindigkeiten sind beispielsweise beim Sitzen auf einer Parkbank bevorzugt. Höhere Windgeschwindigkeiten sind andererseits akzeptabel, wenn man zum Joggen geht. Das Verständnis des Windkomforts ist wichtig für die Gestaltungsentscheidungen über die städtische Morphologie und das Design des Freiraums sowie für die Bestimmung angemessener Nutzungen des Freiraums.
    </p>

    <h4>Warum erscheinen die Ergebnisse kachelförmig?</h4>
    <p>
        Die angezeigten Ergebnisse werden in Echtzeit durchgeführt. Trotz erheblicher Zeitersparnis, die durch das ML-trainierte Modell ermöglicht wird, ist die Berechnung immer noch rechenintensiv. Aus diesem Grund führt der InFraRed-Server Berechnungen in Stapeln von bis zu 500x500m großen quadratischen Kacheln durch. Informationen über den Gebäudestandort und die Höhe werden als geografische Daten von der lokalen CityPyO an die InFraRed-API gesendet. Die Berechnungsergebnisse werden dann zurückgesendet und im Master Portal-Frontend angezeigt.
    </p>
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
